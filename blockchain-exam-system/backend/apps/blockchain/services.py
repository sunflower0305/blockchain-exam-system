"""
区块链和 IPFS 服务模块

提供:
- Hyperledger Fabric 链码调用
- IPFS 文件存储
"""
import json
import hashlib
import logging
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)


class IPFSService:
    """
    IPFS 文件存储服务

    使用 IPFS 存储加密后的试卷文件
    """

    def __init__(self):
        self.host = settings.IPFS_HOST
        self.port = settings.IPFS_PORT
        self._client = None

    @property
    def client(self):
        """懒加载 IPFS 客户端"""
        if self._client is None:
            try:
                import ipfshttpclient
                self._client = ipfshttpclient.connect(
                    f'/ip4/{self.host}/tcp/{self.port}'
                )
            except Exception as e:
                logger.error(f"IPFS连接失败: {e}")
                # 使用模拟客户端进行开发测试
                self._client = MockIPFSClient()
        return self._client

    def upload(self, content: bytes) -> str:
        """
        上传文件到 IPFS

        Args:
            content: 文件内容 (bytes)

        Returns:
            str: IPFS 哈希 (CID)
        """
        try:
            result = self.client.add_bytes(content)
            if isinstance(result, dict):
                return result['Hash']
            return result
        except Exception as e:
            logger.error(f"IPFS上传失败: {e}")
            raise

    def download(self, ipfs_hash: str) -> bytes:
        """
        从 IPFS 下载文件

        Args:
            ipfs_hash: IPFS 哈希 (CID)

        Returns:
            bytes: 文件内容
        """
        try:
            return self.client.cat(ipfs_hash)
        except Exception as e:
            logger.error(f"IPFS下载失败: {e}")
            raise

    def pin(self, ipfs_hash: str) -> bool:
        """
        固定文件（防止被垃圾回收）

        Args:
            ipfs_hash: IPFS 哈希

        Returns:
            bool: 是否成功
        """
        try:
            self.client.pin.add(ipfs_hash)
            return True
        except Exception as e:
            logger.error(f"IPFS pin失败: {e}")
            return False

    def unpin(self, ipfs_hash: str) -> bool:
        """
        取消固定

        Args:
            ipfs_hash: IPFS 哈希

        Returns:
            bool: 是否成功
        """
        try:
            self.client.pin.rm(ipfs_hash)
            return True
        except Exception as e:
            logger.error(f"IPFS unpin失败: {e}")
            return False


class MockIPFSClient:
    """模拟 IPFS 客户端（用于开发测试）"""

    def __init__(self):
        self._storage = {}

    def add_bytes(self, content: bytes) -> str:
        """模拟上传"""
        # 生成类似 IPFS 的哈希
        content_hash = hashlib.sha256(content).hexdigest()
        fake_cid = f"Qm{content_hash[:44]}"
        self._storage[fake_cid] = content
        return fake_cid

    def cat(self, cid: str) -> bytes:
        """模拟下载"""
        if cid in self._storage:
            return self._storage[cid]
        raise FileNotFoundError(f"CID not found: {cid}")

    class pin:
        @staticmethod
        def add(cid): pass

        @staticmethod
        def rm(cid): pass


class BlockchainService:
    """
    Hyperledger Fabric 区块链服务

    提供链码调用功能
    """

    def __init__(self):
        self.config = settings.FABRIC_CONFIG
        self._gateway = None

    def _get_gateway(self):
        """
        获取 Fabric Gateway 连接

        注意: 需要安装 fabric-gateway Python SDK
        pip install fabric-gateway
        """
        if self._gateway is None:
            try:
                # 实际项目中需要配置证书和连接信息
                # from fabric_gateway import Gateway, GatewayBuilder
                # self._gateway = GatewayBuilder()...
                logger.warning("使用模拟区块链服务")
                self._gateway = MockFabricGateway()
            except Exception as e:
                logger.error(f"Fabric连接失败: {e}")
                self._gateway = MockFabricGateway()
        return self._gateway

    def store_paper(self, paper_id: str, exam_id: str, ipfs_hash: str,
                    file_hash: str, unlock_time: str) -> Dict[str, Any]:
        """
        存储试卷信息到区块链

        Args:
            paper_id: 试卷ID
            exam_id: 考试ID
            ipfs_hash: IPFS 哈希
            file_hash: 文件哈希
            unlock_time: 解锁时间

        Returns:
            dict: 交易结果
        """
        gateway = self._get_gateway()

        try:
            result = gateway.invoke_chaincode(
                chaincode=self.config['CHAINCODE_NAME'],
                function='StorePaper',
                args=[paper_id, exam_id, ipfs_hash, file_hash, unlock_time]
            )
            return result
        except Exception as e:
            logger.error(f"区块链存储失败: {e}")
            raise

    def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        从区块链查询试卷信息

        Args:
            paper_id: 试卷ID

        Returns:
            dict: 试卷信息
        """
        gateway = self._get_gateway()

        try:
            result = gateway.query_chaincode(
                chaincode=self.config['CHAINCODE_NAME'],
                function='GetPaper',
                args=[paper_id]
            )
            return result
        except Exception as e:
            logger.error(f"区块链查询失败: {e}")
            return None

    def get_paper_history(self, paper_id: str) -> list:
        """
        获取试卷的历史记录

        Args:
            paper_id: 试卷ID

        Returns:
            list: 历史记录列表
        """
        gateway = self._get_gateway()

        try:
            result = gateway.query_chaincode(
                chaincode=self.config['CHAINCODE_NAME'],
                function='GetPaperHistory',
                args=[paper_id]
            )
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"区块链查询历史失败: {e}")
            return []

    def verify_paper(self, paper_id: str, expected_hash: str) -> bool:
        """
        验证试卷完整性

        Args:
            paper_id: 试卷ID
            expected_hash: 预期的文件哈希

        Returns:
            bool: 验证结果
        """
        paper_info = self.get_paper(paper_id)
        if paper_info:
            return paper_info.get('file_hash') == expected_hash
        return False


class MockFabricGateway:
    """模拟 Fabric Gateway（用于开发测试）"""

    def __init__(self):
        self._ledger = {}
        self._tx_counter = 0

    def invoke_chaincode(self, chaincode: str, function: str, args: list) -> Dict[str, Any]:
        """模拟链码调用"""
        self._tx_counter += 1
        tx_id = hashlib.sha256(f"{self._tx_counter}".encode()).hexdigest()

        if function == 'StorePaper':
            paper_id, exam_id, ipfs_hash, file_hash, unlock_time = args
            self._ledger[paper_id] = {
                'paper_id': paper_id,
                'exam_id': exam_id,
                'ipfs_hash': ipfs_hash,
                'file_hash': file_hash,
                'unlock_time': unlock_time,
                'tx_id': tx_id,
                'block_number': self._tx_counter
            }
            return {
                'tx_id': tx_id,
                'block_number': self._tx_counter,
                'status': 'SUCCESS'
            }

        return {'tx_id': tx_id, 'status': 'SUCCESS'}

    def query_chaincode(self, chaincode: str, function: str, args: list) -> Any:
        """模拟链码查询"""
        if function == 'GetPaper':
            paper_id = args[0]
            return self._ledger.get(paper_id)

        if function == 'GetPaperHistory':
            paper_id = args[0]
            if paper_id in self._ledger:
                return [self._ledger[paper_id]]
            return []

        return None
