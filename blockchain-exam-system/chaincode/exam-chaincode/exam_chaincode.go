/*
 * 区块链试卷加密系统 - Hyperledger Fabric 链码
 *
 * 功能:
 * - 存储加密试卷的元数据
 * - 时间锁机制
 * - 访问控制
 * - 审计日志
 */

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ExamPaperContract 试卷智能合约
type ExamPaperContract struct {
	contractapi.Contract
}

// ExamPaper 试卷结构
type ExamPaper struct {
	PaperID     string    `json:"paper_id"`
	ExamID      string    `json:"exam_id"`
	Subject     string    `json:"subject"`
	IPFSHash    string    `json:"ipfs_hash"`     // 加密文件的IPFS哈希
	FileHash    string    `json:"file_hash"`     // 原始文件的SM3哈希
	UnlockTime  string    `json:"unlock_time"`   // 解锁时间 (ISO8601格式)
	Status      string    `json:"status"`        // draft, uploaded, locked, unlocked
	UploadedBy  string    `json:"uploaded_by"`   // 上传者ID
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

// AccessLog 访问日志
type AccessLog struct {
	LogID     string `json:"log_id"`
	PaperID   string `json:"paper_id"`
	UserID    string `json:"user_id"`
	Action    string `json:"action"`    // upload, view, decrypt
	Timestamp string `json:"timestamp"`
	IPAddress string `json:"ip_address"`
	Details   string `json:"details"`
}

// ===================== 初始化 =====================

// InitLedger 初始化账本
func (c *ExamPaperContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Exam Paper Chaincode initialized")
	return nil
}

// ===================== 试卷管理 =====================

// StorePaper 存储试卷信息
func (c *ExamPaperContract) StorePaper(
	ctx contractapi.TransactionContextInterface,
	paperID string,
	examID string,
	subject string,
	ipfsHash string,
	fileHash string,
	unlockTime string,
	uploadedBy string,
) error {
	// 验证参数
	if paperID == "" || ipfsHash == "" || fileHash == "" {
		return fmt.Errorf("paperID, ipfsHash and fileHash are required")
	}

	// 验证IPFS哈希格式 (Qm开头，46字符)
	if len(ipfsHash) < 46 || ipfsHash[:2] != "Qm" {
		return fmt.Errorf("invalid IPFS hash format")
	}

	// 检查是否已存在
	existing, err := ctx.GetStub().GetState(paperID)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("paper %s already exists", paperID)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	paper := ExamPaper{
		PaperID:    paperID,
		ExamID:     examID,
		Subject:    subject,
		IPFSHash:   ipfsHash,
		FileHash:   fileHash,
		UnlockTime: unlockTime,
		Status:     "locked",
		UploadedBy: uploadedBy,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	paperJSON, err := json.Marshal(paper)
	if err != nil {
		return fmt.Errorf("failed to marshal paper: %v", err)
	}

	// 存储到账本
	err = ctx.GetStub().PutState(paperID, paperJSON)
	if err != nil {
		return fmt.Errorf("failed to put state: %v", err)
	}

	// 记录事件
	err = ctx.GetStub().SetEvent("PaperStored", paperJSON)
	if err != nil {
		return fmt.Errorf("failed to set event: %v", err)
	}

	return nil
}

// GetPaper 获取试卷信息
func (c *ExamPaperContract) GetPaper(
	ctx contractapi.TransactionContextInterface,
	paperID string,
) (*ExamPaper, error) {
	paperJSON, err := ctx.GetStub().GetState(paperID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if paperJSON == nil {
		return nil, fmt.Errorf("paper %s does not exist", paperID)
	}

	var paper ExamPaper
	err = json.Unmarshal(paperJSON, &paper)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal paper: %v", err)
	}

	return &paper, nil
}

// UpdatePaperStatus 更新试卷状态
func (c *ExamPaperContract) UpdatePaperStatus(
	ctx contractapi.TransactionContextInterface,
	paperID string,
	newStatus string,
) error {
	paper, err := c.GetPaper(ctx, paperID)
	if err != nil {
		return err
	}

	// 验证状态转换
	validTransitions := map[string][]string{
		"draft":    {"locked"},
		"locked":   {"unlocked"},
		"unlocked": {"archived"},
	}

	allowed := false
	for _, s := range validTransitions[paper.Status] {
		if s == newStatus {
			allowed = true
			break
		}
	}

	if !allowed {
		return fmt.Errorf("invalid status transition from %s to %s", paper.Status, newStatus)
	}

	paper.Status = newStatus
	paper.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	paperJSON, err := json.Marshal(paper)
	if err != nil {
		return fmt.Errorf("failed to marshal paper: %v", err)
	}

	return ctx.GetStub().PutState(paperID, paperJSON)
}

// CheckUnlockTime 检查是否可以解锁
func (c *ExamPaperContract) CheckUnlockTime(
	ctx contractapi.TransactionContextInterface,
	paperID string,
) (bool, error) {
	paper, err := c.GetPaper(ctx, paperID)
	if err != nil {
		return false, err
	}

	unlockTime, err := time.Parse(time.RFC3339, paper.UnlockTime)
	if err != nil {
		return false, fmt.Errorf("failed to parse unlock time: %v", err)
	}

	now := time.Now().UTC()
	return now.After(unlockTime), nil
}

// UnlockPaper 解锁试卷（需要验证时间）
func (c *ExamPaperContract) UnlockPaper(
	ctx contractapi.TransactionContextInterface,
	paperID string,
	requesterID string,
) error {
	canUnlock, err := c.CheckUnlockTime(ctx, paperID)
	if err != nil {
		return err
	}

	if !canUnlock {
		paper, _ := c.GetPaper(ctx, paperID)
		return fmt.Errorf("paper cannot be unlocked until %s", paper.UnlockTime)
	}

	// 更新状态
	err = c.UpdatePaperStatus(ctx, paperID, "unlocked")
	if err != nil {
		return err
	}

	// 记录解锁日志
	return c.RecordAccess(ctx, paperID, requesterID, "unlock", "", "Paper unlocked by authorized user")
}

// ===================== 访问日志 =====================

// RecordAccess 记录访问日志
func (c *ExamPaperContract) RecordAccess(
	ctx contractapi.TransactionContextInterface,
	paperID string,
	userID string,
	action string,
	ipAddress string,
	details string,
) error {
	txID := ctx.GetStub().GetTxID()
	timestamp := time.Now().UTC().Format(time.RFC3339)

	log := AccessLog{
		LogID:     fmt.Sprintf("LOG_%s", txID[:16]),
		PaperID:   paperID,
		UserID:    userID,
		Action:    action,
		Timestamp: timestamp,
		IPAddress: ipAddress,
		Details:   details,
	}

	logJSON, err := json.Marshal(log)
	if err != nil {
		return fmt.Errorf("failed to marshal log: %v", err)
	}

	// 使用复合键存储日志
	compositeKey, err := ctx.GetStub().CreateCompositeKey("AccessLog", []string{paperID, log.LogID})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}

	return ctx.GetStub().PutState(compositeKey, logJSON)
}

// GetPaperAccessLogs 获取试卷的访问日志
func (c *ExamPaperContract) GetPaperAccessLogs(
	ctx contractapi.TransactionContextInterface,
	paperID string,
) ([]*AccessLog, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("AccessLog", []string{paperID})
	if err != nil {
		return nil, fmt.Errorf("failed to get logs: %v", err)
	}
	defer iterator.Close()

	var logs []*AccessLog
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		var log AccessLog
		err = json.Unmarshal(result.Value, &log)
		if err != nil {
			return nil, err
		}
		logs = append(logs, &log)
	}

	return logs, nil
}

// ===================== 历史查询 =====================

// GetPaperHistory 获取试卷历史
func (c *ExamPaperContract) GetPaperHistory(
	ctx contractapi.TransactionContextInterface,
	paperID string,
) ([]map[string]interface{}, error) {
	iterator, err := ctx.GetStub().GetHistoryForKey(paperID)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
	}
	defer iterator.Close()

	var history []map[string]interface{}
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		var paper ExamPaper
		if len(result.Value) > 0 {
			err = json.Unmarshal(result.Value, &paper)
			if err != nil {
				continue
			}
		}

		record := map[string]interface{}{
			"tx_id":     result.TxId,
			"timestamp": time.Unix(result.Timestamp.Seconds, int64(result.Timestamp.Nanos)).Format(time.RFC3339),
			"is_delete": result.IsDelete,
			"paper":     paper,
		}
		history = append(history, record)
	}

	return history, nil
}

// ===================== 批量查询 =====================

// GetAllPapers 获取所有试卷（分页）
func (c *ExamPaperContract) GetAllPapers(
	ctx contractapi.TransactionContextInterface,
	pageSize int32,
	bookmark string,
) (*PaginatedResult, error) {
	query := `{"selector":{"paper_id":{"$gt":""}}}`

	iterator, metadata, err := ctx.GetStub().GetQueryResultWithPagination(query, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query: %v", err)
	}
	defer iterator.Close()

	var papers []*ExamPaper
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		var paper ExamPaper
		err = json.Unmarshal(result.Value, &paper)
		if err != nil {
			continue
		}
		papers = append(papers, &paper)
	}

	return &PaginatedResult{
		Papers:       papers,
		RecordCount:  metadata.FetchedRecordsCount,
		Bookmark:     metadata.Bookmark,
	}, nil
}

// PaginatedResult 分页结果
type PaginatedResult struct {
	Papers      []*ExamPaper `json:"papers"`
	RecordCount int32        `json:"record_count"`
	Bookmark    string       `json:"bookmark"`
}

// GetPapersByExam 按考试ID查询试卷
func (c *ExamPaperContract) GetPapersByExam(
	ctx contractapi.TransactionContextInterface,
	examID string,
) ([]*ExamPaper, error) {
	query := fmt.Sprintf(`{"selector":{"exam_id":"%s"}}`, examID)

	iterator, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query: %v", err)
	}
	defer iterator.Close()

	var papers []*ExamPaper
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}

		var paper ExamPaper
		err = json.Unmarshal(result.Value, &paper)
		if err != nil {
			continue
		}
		papers = append(papers, &paper)
	}

	return papers, nil
}

// ===================== 验证 =====================

// VerifyPaperHash 验证试卷哈希
func (c *ExamPaperContract) VerifyPaperHash(
	ctx contractapi.TransactionContextInterface,
	paperID string,
	providedHash string,
) (bool, error) {
	paper, err := c.GetPaper(ctx, paperID)
	if err != nil {
		return false, err
	}

	return paper.FileHash == providedHash, nil
}

// ===================== 主函数 =====================

func main() {
	chaincode, err := contractapi.NewChaincode(&ExamPaperContract{})
	if err != nil {
		fmt.Printf("Error creating exam-chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting exam-chaincode: %v\n", err)
	}
}
