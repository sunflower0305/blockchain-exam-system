#!/bin/bash

# 区块链考试系统 - Fabric 网络启动脚本
# 使用方法: ./setup-network.sh [up|down|restart|generate]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置变量
FABRIC_VERSION=2.5
CA_VERSION=1.5
CHANNEL_NAME="examchannel"
CHAINCODE_NAME="exam-chaincode"
CHAINCODE_VERSION="1.0"

# 目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$FABRIC_DIR")"
CHAINCODE_DIR="$PROJECT_DIR/chaincode/exam-chaincode"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 和必要工具
check_prerequisites() {
    log_info "检查必要工具..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    log_info "所有必要工具已就绪"
}

# 下载 Fabric 二进制文件（如果需要）
download_binaries() {
    if [ ! -d "$FABRIC_DIR/bin" ]; then
        log_info "下载 Fabric 二进制文件..."
        cd "$FABRIC_DIR"

        curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${CA_VERSION} -d -s

        log_info "二进制文件下载完成"
    else
        log_info "Fabric 二进制文件已存在"
    fi
}

# 生成加密材料
generate_crypto() {
    log_info "生成加密材料..."

    cd "$FABRIC_DIR"

    # 清理旧的加密材料
    rm -rf organizations/peerOrganizations
    rm -rf organizations/ordererOrganizations

    # 使用 cryptogen 生成
    if [ -f "$FABRIC_DIR/bin/cryptogen" ]; then
        ./bin/cryptogen generate --config=./config/crypto-config.yaml --output=./organizations
    else
        # 使用 Docker 运行 cryptogen
        docker run --rm \
            -v "$FABRIC_DIR/config:/config" \
            -v "$FABRIC_DIR/organizations:/organizations" \
            hyperledger/fabric-tools:${FABRIC_VERSION} \
            cryptogen generate --config=/config/crypto-config.yaml --output=/organizations
    fi

    log_info "加密材料生成完成"
}

# 生成创世区块和通道配置
generate_genesis() {
    log_info "生成创世区块..."

    cd "$FABRIC_DIR"

    rm -rf channel-artifacts
    mkdir -p channel-artifacts

    if [ -f "$FABRIC_DIR/bin/configtxgen" ]; then
        export FABRIC_CFG_PATH="$FABRIC_DIR/config"

        # 生成创世区块
        ./bin/configtxgen -profile ExamOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

        # 生成通道配置
        ./bin/configtxgen -profile ExamChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID ${CHANNEL_NAME}

        # 生成锚节点配置
        ./bin/configtxgen -profile ExamChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID ${CHANNEL_NAME} -asOrg Org1MSP
    else
        docker run --rm \
            -v "$FABRIC_DIR/config:/config" \
            -v "$FABRIC_DIR/organizations:/organizations" \
            -v "$FABRIC_DIR/channel-artifacts:/channel-artifacts" \
            -e FABRIC_CFG_PATH=/config \
            hyperledger/fabric-tools:${FABRIC_VERSION} \
            bash -c "
                configtxgen -profile ExamOrdererGenesis -channelID system-channel -outputBlock /channel-artifacts/genesis.block && \
                configtxgen -profile ExamChannel -outputCreateChannelTx /channel-artifacts/${CHANNEL_NAME}.tx -channelID ${CHANNEL_NAME} && \
                configtxgen -profile ExamChannel -outputAnchorPeersUpdate /channel-artifacts/Org1MSPanchors.tx -channelID ${CHANNEL_NAME} -asOrg Org1MSP
            "
    fi

    log_info "创世区块和通道配置生成完成"
}

# 启动网络
network_up() {
    log_info "启动 Fabric 网络..."

    cd "$FABRIC_DIR"

    # 启动容器
    docker-compose -f docker-compose-fabric.yml up -d

    # 等待网络启动
    log_info "等待网络启动..."
    sleep 10

    log_info "Fabric 网络已启动"
}

# 创建通道
create_channel() {
    log_info "创建通道 ${CHANNEL_NAME}..."

    cd "$FABRIC_DIR"

    # 使用 CLI 容器创建通道
    docker exec cli peer channel create \
        -o orderer.exam.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/channel-artifacts/${CHANNEL_NAME}.tx \
        --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/config/channel-artifacts/${CHANNEL_NAME}.block \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/exam.com/orderers/orderer.exam.com/msp/tlscacerts/tlsca.exam.com-cert.pem

    log_info "通道创建完成"
}

# 加入通道
join_channel() {
    log_info "Peer 加入通道..."

    docker exec cli peer channel join \
        -b /opt/gopath/src/github.com/hyperledger/fabric/peer/config/channel-artifacts/${CHANNEL_NAME}.block

    log_info "Peer 已加入通道"
}

# 更新锚节点
update_anchor_peers() {
    log_info "更新锚节点..."

    docker exec cli peer channel update \
        -o orderer.exam.com:7050 \
        -c ${CHANNEL_NAME} \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/config/channel-artifacts/Org1MSPanchors.tx \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/exam.com/orderers/orderer.exam.com/msp/tlscacerts/tlsca.exam.com-cert.pem

    log_info "锚节点更新完成"
}

# 打包链码
package_chaincode() {
    log_info "打包链码..."

    cd "$FABRIC_DIR"

    # 在 CLI 容器中打包链码
    docker exec cli peer lifecycle chaincode package \
        /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/${CHAINCODE_NAME}.tar.gz \
        --path /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/exam-chaincode \
        --lang golang \
        --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

    log_info "链码打包完成"
}

# 安装链码
install_chaincode() {
    log_info "安装链码..."

    docker exec cli peer lifecycle chaincode install \
        /opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode/${CHAINCODE_NAME}.tar.gz

    log_info "链码安装完成"
}

# 批准链码
approve_chaincode() {
    log_info "批准链码定义..."

    # 获取链码包ID
    PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | awk '{print $3}' | cut -d',' -f1)

    if [ -z "$PACKAGE_ID" ]; then
        log_error "未找到链码包ID"
        exit 1
    fi

    log_info "链码包ID: $PACKAGE_ID"

    docker exec cli peer lifecycle chaincode approveformyorg \
        -o orderer.exam.com:7050 \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --package-id ${PACKAGE_ID} \
        --sequence 1 \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/exam.com/orderers/orderer.exam.com/msp/tlscacerts/tlsca.exam.com-cert.pem

    log_info "链码定义已批准"
}

# 提交链码定义
commit_chaincode() {
    log_info "提交链码定义..."

    docker exec cli peer lifecycle chaincode commit \
        -o orderer.exam.com:7050 \
        --channelID ${CHANNEL_NAME} \
        --name ${CHAINCODE_NAME} \
        --version ${CHAINCODE_VERSION} \
        --sequence 1 \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/exam.com/orderers/orderer.exam.com/msp/tlscacerts/tlsca.exam.com-cert.pem \
        --peerAddresses peer0.org1.exam.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.exam.com/peers/peer0.org1.exam.com/tls/ca.crt

    log_info "链码定义已提交"
}

# 初始化链码
init_chaincode() {
    log_info "初始化链码..."

    docker exec cli peer chaincode invoke \
        -o orderer.exam.com:7050 \
        -C ${CHANNEL_NAME} \
        -n ${CHAINCODE_NAME} \
        -c '{"function":"InitLedger","Args":[]}' \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/exam.com/orderers/orderer.exam.com/msp/tlscacerts/tlsca.exam.com-cert.pem \
        --peerAddresses peer0.org1.exam.com:7051 \
        --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.exam.com/peers/peer0.org1.exam.com/tls/ca.crt

    log_info "链码初始化完成"
}

# 停止网络
network_down() {
    log_info "停止 Fabric 网络..."

    cd "$FABRIC_DIR"

    docker-compose -f docker-compose-fabric.yml down -v

    # 清理链码容器
    docker rm -f $(docker ps -aq --filter "name=dev-peer") 2>/dev/null || true

    # 清理链码镜像
    docker rmi -f $(docker images -q --filter "reference=dev-peer*") 2>/dev/null || true

    log_info "网络已停止"
}

# 清理所有
clean_all() {
    log_info "清理所有生成的文件..."

    network_down

    cd "$FABRIC_DIR"

    rm -rf organizations/peerOrganizations
    rm -rf organizations/ordererOrganizations
    rm -rf channel-artifacts

    log_info "清理完成"
}

# 部署链码完整流程
deploy_chaincode() {
    package_chaincode
    install_chaincode
    approve_chaincode
    commit_chaincode
    sleep 3
    init_chaincode
}

# 完整启动流程
full_start() {
    check_prerequisites
    generate_crypto
    generate_genesis
    network_up
    sleep 5
    create_channel
    join_channel
    update_anchor_peers
    deploy_chaincode

    log_info "============================================"
    log_info "Fabric 网络启动成功！"
    log_info "通道: ${CHANNEL_NAME}"
    log_info "链码: ${CHAINCODE_NAME}"
    log_info "============================================"
}

# 主函数
case "$1" in
    up)
        full_start
        ;;
    down)
        network_down
        ;;
    restart)
        network_down
        full_start
        ;;
    generate)
        generate_crypto
        generate_genesis
        ;;
    deploy)
        deploy_chaincode
        ;;
    clean)
        clean_all
        ;;
    *)
        echo "使用方法: $0 {up|down|restart|generate|deploy|clean}"
        echo "  up       - 启动完整网络（包括生成证书、创建通道、部署链码）"
        echo "  down     - 停止网络"
        echo "  restart  - 重启网络"
        echo "  generate - 仅生成加密材料和创世区块"
        echo "  deploy   - 部署/更新链码"
        echo "  clean    - 清理所有生成的文件"
        exit 1
        ;;
esac
