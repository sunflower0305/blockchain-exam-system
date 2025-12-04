"""
区块链和 IPFS 服务模块

提供:
- Hyperledger Fabric 链码调用（支持真实网络和模拟模式）
- IPFS 文件存储（支持真实节点和模拟模式）
"""
import json
import hashlib
import logging
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


# ===================== IPFS 服务 =====================

class IPFSService:
    """
    IPFS 文件存储服务

    支持:
    - 真实 IPFS 节点连接
    - 模拟模式（用于开发测试）
    """

    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.host = getattr(settings, 'IPFS_HOST', '127.0.0.1')
        self.port = getattr(settings, 'IPFS_PORT', 5001)
        self.use_mock = getattr(settings, 'IPFS_USE_MOCK', False)
        self._connected = False

    @property
    def client(self):
        """懒加载 IPFS 客户端"""
        if self._client is None:
            if self.use_mock:
                logger.info("使用模拟 IPFS 客户端")
                self._client = MockIPFSClient()
                self._connected = True
            else:
                try:
                    import ipfshttpclient
                    import socket

                    # 解析主机名为 IP 地址（支持 Docker 网络）
                    try:
                        resolved_host = socket.gethostbyname(self.host)
                    except socket.gaierror:
                        resolved_host = self.host

                    self._client = ipfshttpclient.connect(
                        f'/ip4/{resolved_host}/tcp/{self.port}',
                        timeout=30
                    )
                    # 测试连接
                    self._client.id()
                    self._connected = True
                    logger.info(f"IPFS 连接成功: {self.host}({resolved_host}):{self.port}")
                except Exception as e:
                    logger.warning(f"IPFS 连接失败，使用模拟客户端: {e}")
                    self._client = MockIPFSClient()
                    self._connected = True
        return self._client

    def is_connected(self) -> bool:
        """检查连接状态"""
        try:
            _ = self.client
            return self._connected
        except:
            return False

    def get_node_info(self) -> Dict[str, Any]:
        """获取节点信息"""
        try:
            if isinstance(self.client, MockIPFSClient):
                return {
                    'connected': True,
                    'mode': 'mock',
                    'host': self.host,
                    'port': self.port,
                    'version': 'mock-1.0.0'
                }
            info = self.client.id()
            return {
                'connected': True,
                'mode': 'real',
                'host': self.host,
                'port': self.port,
                'peer_id': info.get('ID', ''),
                'version': info.get('AgentVersion', ''),
                'addresses': info.get('Addresses', [])[:3]  # 只返回前3个地址
            }
        except Exception as e:
            return {
                'connected': False,
                'mode': 'error',
                'error': str(e)
            }

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
                cid = result['Hash']
            else:
                cid = result

            logger.info(f"IPFS 上传成功: {cid}")
            return cid
        except Exception as e:
            logger.error(f"IPFS 上传失败: {e}")
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
            content = self.client.cat(ipfs_hash)
            logger.info(f"IPFS 下载成功: {ipfs_hash}")
            return content
        except Exception as e:
            logger.error(f"IPFS 下载失败: {e}")
            raise

    def pin(self, ipfs_hash: str) -> bool:
        """固定文件（防止被垃圾回收）"""
        try:
            self.client.pin.add(ipfs_hash)
            logger.info(f"IPFS 固定成功: {ipfs_hash}")
            return True
        except Exception as e:
            logger.error(f"IPFS 固定失败: {e}")
            return False

    def unpin(self, ipfs_hash: str) -> bool:
        """取消固定"""
        try:
            self.client.pin.rm(ipfs_hash)
            return True
        except Exception as e:
            logger.error(f"IPFS 取消固定失败: {e}")
            return False


class MockIPFSClient:
    """模拟 IPFS 客户端（用于开发测试）"""

    # 使用类变量存储，模拟持久化
    _storage = {}

    def __init__(self):
        pass

    def id(self):
        return {
            'ID': 'QmMockPeerID12345',
            'AgentVersion': 'mock-ipfs/1.0.0',
            'Addresses': ['/ip4/127.0.0.1/tcp/4001']
        }

    def add_bytes(self, content: bytes) -> str:
        """模拟上传"""
        content_hash = hashlib.sha256(content).hexdigest()
        fake_cid = f"Qm{content_hash[:44]}"
        MockIPFSClient._storage[fake_cid] = content
        logger.debug(f"Mock IPFS 存储: {fake_cid}")
        return fake_cid

    def cat(self, cid: str) -> bytes:
        """模拟下载"""
        if cid in MockIPFSClient._storage:
            return MockIPFSClient._storage[cid]
        raise FileNotFoundError(f"CID not found: {cid}")

    class pin:
        @staticmethod
        def add(cid):
            pass

        @staticmethod
        def rm(cid):
            pass


# ===================== 区块链服务 =====================

class BlockchainService:
    """
    Hyperledger Fabric 区块链服务

    支持:
    - 真实 Fabric Gateway 连接
    - 模拟模式（用于开发测试）
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.config = getattr(settings, 'FABRIC_CONFIG', {})
        self.use_mock = getattr(settings, 'FABRIC_USE_MOCK', True)
        self._gateway = None
        self._contract = None
        self._connected = False

    def _get_gateway(self):
        """获取 Fabric Gateway 连接"""
        if self._gateway is not None:
            return self._gateway

        if self.use_mock:
            logger.info("使用模拟区块链服务")
            self._gateway = MockFabricGateway()
            self._connected = True
            return self._gateway

        try:
            # 使用 CLI 方式连接 Fabric
            self._gateway = CLIFabricGateway(
                channel_name=self.config.get('CHANNEL_NAME', 'examchannel'),
                chaincode_name=self.config.get('CHAINCODE_NAME', 'exam-chaincode')
            )
            # 测试连接
            if self._gateway.test_connection():
                self._connected = True
                logger.info("Fabric CLI Gateway 连接成功")
            else:
                raise Exception("Fabric CLI 连接测试失败")

        except Exception as e:
            logger.warning(f"Fabric 连接失败: {e}，使用模拟客户端")
            self._gateway = MockFabricGateway()
            self._connected = True

        return self._gateway

    def is_connected(self) -> bool:
        """检查连接状态"""
        try:
            _ = self._get_gateway()
            return self._connected
        except:
            return False

    def get_network_info(self) -> Dict[str, Any]:
        """获取网络信息"""
        gateway = self._get_gateway()

        if isinstance(gateway, MockFabricGateway):
            # 尝试获取真实网络信息（如果可用）
            try:
                cli_gateway = CLIFabricGateway(
                    channel_name=self.config.get('CHANNEL_NAME', 'examchannel'),
                    chaincode_name=self.config.get('CHAINCODE_NAME', 'exam-chaincode')
                )
                if cli_gateway.test_connection():
                    info = cli_gateway.get_network_info()
                    info['mode'] = 'mock (Fabric 网络已就绪)'
                    info['data_storage'] = '模拟存储'
                    return info
            except:
                pass

            return {
                'connected': True,
                'mode': 'mock',
                'network': 'Hyperledger Fabric (模拟)',
                'channel': self.config.get('CHANNEL_NAME', 'examchannel'),
                'chaincode': self.config.get('CHAINCODE_NAME', 'exam-chaincode'),
                'msp_id': self.config.get('MSP_ID', 'Org1MSP'),
                'peer_endpoint': 'localhost:7051 (模拟)',
                'ledger_height': gateway.get_ledger_height(),
                'last_sync': datetime.now().isoformat()
            }

        return gateway.get_network_info()

    def store_paper(self, paper_id: str, exam_id: str, ipfs_hash: str,
                    file_hash: str, unlock_time: str, uploaded_by: str = '',
                    subject: str = '') -> Dict[str, Any]:
        """
        存储试卷信息到区块链

        Args:
            paper_id: 试卷ID
            exam_id: 考试ID
            ipfs_hash: IPFS 哈希
            file_hash: 文件哈希
            unlock_time: 解锁时间 (ISO8601格式)
            uploaded_by: 上传者ID
            subject: 科目名称

        Returns:
            dict: 交易结果 {'tx_id': str, 'block_number': int, 'status': str}
        """
        gateway = self._get_gateway()

        try:
            result = gateway.invoke_chaincode(
                function='StorePaper',
                args=[paper_id, exam_id, subject, ipfs_hash, file_hash, unlock_time, uploaded_by]
            )
            logger.info(f"区块链存储成功: paper_id={paper_id}, tx_id={result.get('tx_id')}")
            return result
        except Exception as e:
            logger.error(f"区块链存储失败: {e}")
            raise

    def get_paper(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """从区块链查询试卷信息"""
        gateway = self._get_gateway()

        try:
            result = gateway.query_chaincode(
                function='GetPaper',
                args=[paper_id]
            )
            return result
        except Exception as e:
            logger.error(f"区块链查询失败: {e}")
            return None

    def get_paper_history(self, paper_id: str) -> List[Dict[str, Any]]:
        """获取试卷的历史记录"""
        gateway = self._get_gateway()

        try:
            result = gateway.query_chaincode(
                function='GetPaperHistory',
                args=[paper_id]
            )
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"区块链查询历史失败: {e}")
            return []

    def verify_paper(self, paper_id: str, expected_hash: str) -> Dict[str, Any]:
        """
        验证试卷完整性

        Returns:
            dict: {'valid': bool, 'paper_info': dict, 'message': str}
        """
        paper_info = self.get_paper(paper_id)

        # 如果区块链中找不到，尝试从数据库获取（模拟模式下可能数据在重启后丢失）
        if not paper_info:
            try:
                from apps.exams.models import ExamPaper
                paper = ExamPaper.objects.get(id=paper_id)

                # 检查是否已上链
                if paper.blockchain_tx_id:
                    paper_info = {
                        'paper_id': str(paper.id),
                        'exam_id': str(paper.exam.id),
                        'ipfs_hash': paper.ipfs_hash,
                        'file_hash': paper.file_hash,
                        'status': paper.status,
                        'blockchain_tx_id': paper.blockchain_tx_id,
                        'block_number': paper.block_number,
                        'created_at': paper.created_at.isoformat(),
                        'source': 'database'
                    }
                else:
                    return {
                        'valid': False,
                        'paper_info': None,
                        'message': '试卷尚未上链'
                    }
            except Exception as e:
                logger.warning(f"从数据库获取试卷失败: {e}")
                return {
                    'valid': False,
                    'paper_info': None,
                    'message': '试卷未找到'
                }

        stored_hash = paper_info.get('file_hash', '')
        is_valid = stored_hash == expected_hash

        return {
            'valid': is_valid,
            'paper_info': paper_info,
            'message': '验证通过' if is_valid else '哈希值不匹配，文件可能已被篡改'
        }

    def update_paper_status(self, paper_id: str, new_status: str) -> Dict[str, Any]:
        """更新试卷状态"""
        gateway = self._get_gateway()

        try:
            result = gateway.invoke_chaincode(
                function='UpdatePaperStatus',
                args=[paper_id, new_status]
            )
            return result
        except Exception as e:
            logger.error(f"更新状态失败: {e}")
            raise

    def record_access(self, paper_id: str, user_id: str, action: str,
                      ip_address: str = '', details: str = '') -> Dict[str, Any]:
        """记录访问日志到区块链"""
        gateway = self._get_gateway()

        try:
            result = gateway.invoke_chaincode(
                function='RecordAccess',
                args=[paper_id, user_id, action, ip_address, details]
            )
            return result
        except Exception as e:
            logger.error(f"记录访问日志失败: {e}")
            raise

    def get_paper_access_logs(self, paper_id: str) -> List[Dict[str, Any]]:
        """获取试卷的访问日志"""
        gateway = self._get_gateway()

        try:
            result = gateway.query_chaincode(
                function='GetPaperAccessLogs',
                args=[paper_id]
            )
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"获取访问日志失败: {e}")
            return []

    def get_all_papers(self, page_size: int = 10, bookmark: str = '') -> Dict[str, Any]:
        """获取所有试卷（分页）"""
        gateway = self._get_gateway()

        try:
            result = gateway.query_chaincode(
                function='GetAllPapers',
                args=[str(page_size), bookmark]
            )
            return result if isinstance(result, dict) else {'papers': [], 'bookmark': ''}
        except Exception as e:
            logger.error(f"获取试卷列表失败: {e}")
            return {'papers': [], 'bookmark': ''}


class CLIFabricGateway:
    """通过 Docker CLI 调用 Fabric 网络"""

    def __init__(self, channel_name: str = 'examchannel', chaincode_name: str = 'exam-chaincode'):
        self.channel_name = channel_name
        self.chaincode_name = chaincode_name
        self._tx_counter = 0

    def _exec_peer_command(self, cmd: str) -> tuple:
        """执行 peer 命令"""
        import subprocess

        full_cmd = f'docker exec cli bash -c "{cmd}"'
        try:
            result = subprocess.run(
                full_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return 1, '', 'Command timeout'
        except Exception as e:
            return 1, '', str(e)

    def test_connection(self) -> bool:
        """测试连接"""
        code, stdout, stderr = self._exec_peer_command('peer channel list')
        return code == 0 and self.channel_name in stdout

    def get_ledger_height(self) -> int:
        """获取账本高度"""
        cmd = f'peer channel getinfo -c {self.channel_name}'
        code, stdout, stderr = self._exec_peer_command(cmd)
        if code == 0:
            import re
            # 解析 JSON 格式的输出
            match = re.search(r'"height":(\d+)', stdout + stderr)
            if match:
                return int(match.group(1))
        return 0

    def invoke_chaincode(self, function: str, args: list) -> Dict[str, Any]:
        """调用链码（写操作）"""
        self._tx_counter += 1

        # 构建参数 JSON - 使用单引号包裹整个 JSON
        args_json = json.dumps({"function": function, "Args": args})

        cmd = f'''peer chaincode invoke \
          -o orderer.exam.com:7050 \
          --tls \
          --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/exam.com/orderers/orderer.exam.com/tls/ca.crt \
          -C {self.channel_name} \
          -n {self.chaincode_name} \
          --peerAddresses peer0.org1.exam.com:7051 \
          --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.exam.com/peers/peer0.org1.exam.com/tls/ca.crt \
          -c '{args_json}' '''

        code, stdout, stderr = self._exec_peer_command(cmd)

        if code != 0:
            raise Exception(f"链码调用失败: {stderr}")

        # 解析交易 ID
        import re
        tx_match = re.search(r'txid \[([a-f0-9]+)\]', stderr)
        tx_id = tx_match.group(1) if tx_match else hashlib.sha256(str(self._tx_counter).encode()).hexdigest()

        return {
            'tx_id': tx_id,
            'block_number': self.get_ledger_height(),
            'status': 'SUCCESS'
        }

    def query_chaincode(self, function: str, args: list) -> Any:
        """查询链码（读操作）"""
        args_json = json.dumps({"function": function, "Args": args})

        cmd = f'''peer chaincode query \
          -C {self.channel_name} \
          -n {self.chaincode_name} \
          -c '{args_json}' '''

        code, stdout, stderr = self._exec_peer_command(cmd)

        if code != 0:
            logger.warning(f"链码查询失败: {stderr}")
            return None

        try:
            return json.loads(stdout.strip())
        except json.JSONDecodeError:
            return stdout.strip() if stdout.strip() else None

    def get_network_info(self) -> Dict[str, Any]:
        """获取网络信息"""
        return {
            'connected': True,
            'mode': 'cli',
            'network': 'Hyperledger Fabric',
            'channel': self.channel_name,
            'chaincode': self.chaincode_name,
            'msp_id': 'Org1MSP',
            'peer_endpoint': 'peer0.org1.exam.com:7051',
            'ledger_height': self.get_ledger_height(),
            'last_sync': datetime.now().isoformat()
        }


class RealFabricGateway:
    """真实的 Fabric Gateway 连接"""

    def __init__(self, connection_profile: dict, certificate: bytes,
                 private_key: bytes, msp_id: str, channel_name: str,
                 chaincode_name: str):
        self.connection_profile = connection_profile
        self.certificate = certificate
        self.private_key = private_key
        self.msp_id = msp_id
        self.channel_name = channel_name
        self.chaincode_name = chaincode_name
        self._gateway = None
        self._network = None
        self._contract = None

    def _connect(self):
        """建立连接"""
        if self._contract is not None:
            return

        try:
            from hfc.fabric import Client as FabricClient

            # 使用 fabric-sdk-py
            client = FabricClient()
            client.new_channel(self.channel_name)

            # 配置用户
            user = client.get_user('org1.exam.com', 'Admin')

            self._gateway = client
            self._contract = client.get_channel(self.channel_name).chaincode(self.chaincode_name)

        except ImportError:
            # 如果 fabric-sdk-py 不可用，尝试其他方式
            raise ImportError("请安装 fabric-sdk-py: pip install fabric-sdk-py")

    def invoke_chaincode(self, function: str, args: list) -> Dict[str, Any]:
        """调用链码（写操作）"""
        self._connect()

        try:
            response = self._contract.invoke(
                function,
                args,
                wait_for_event=True
            )

            return {
                'tx_id': response.tx_id if hasattr(response, 'tx_id') else hashlib.sha256(str(response).encode()).hexdigest()[:64],
                'block_number': response.block_number if hasattr(response, 'block_number') else 0,
                'status': 'SUCCESS'
            }
        except Exception as e:
            logger.error(f"链码调用失败: {e}")
            raise

    def query_chaincode(self, function: str, args: list) -> Any:
        """查询链码（读操作）"""
        self._connect()

        try:
            response = self._contract.query(function, args)

            if isinstance(response, bytes):
                return json.loads(response.decode('utf-8'))
            return response
        except Exception as e:
            logger.error(f"链码查询失败: {e}")
            raise

    def get_network_info(self) -> Dict[str, Any]:
        """获取网络信息"""
        return {
            'connected': True,
            'mode': 'real',
            'network': 'Hyperledger Fabric',
            'channel': self.channel_name,
            'chaincode': self.chaincode_name,
            'msp_id': self.msp_id,
            'peer_endpoint': self.connection_profile.get('peers', {}).get('peer0.org1.exam.com', {}).get('url', ''),
            'last_sync': datetime.now().isoformat()
        }


class MockFabricGateway:
    """模拟 Fabric Gateway（用于开发测试）"""

    # 使用类变量存储，模拟持久化账本
    _ledger = {}
    _access_logs = {}
    _tx_counter = 0

    def __init__(self):
        pass

    def get_ledger_height(self) -> int:
        return MockFabricGateway._tx_counter

    def invoke_chaincode(self, function: str, args: list) -> Dict[str, Any]:
        """模拟链码调用"""
        MockFabricGateway._tx_counter += 1
        tx_id = hashlib.sha256(f"{MockFabricGateway._tx_counter}{function}{args}".encode()).hexdigest()
        timestamp = datetime.now().isoformat()

        if function == 'StorePaper':
            paper_id, exam_id, subject, ipfs_hash, file_hash, unlock_time, uploaded_by = args
            MockFabricGateway._ledger[paper_id] = {
                'paper_id': paper_id,
                'exam_id': exam_id,
                'subject': subject,
                'ipfs_hash': ipfs_hash,
                'file_hash': file_hash,
                'unlock_time': unlock_time,
                'uploaded_by': uploaded_by,
                'status': 'locked',
                'created_at': timestamp,
                'updated_at': timestamp,
                'tx_id': tx_id,
                'block_number': MockFabricGateway._tx_counter
            }
            logger.debug(f"Mock 区块链存储: {paper_id}")

        elif function == 'UpdatePaperStatus':
            paper_id, new_status = args
            if paper_id in MockFabricGateway._ledger:
                MockFabricGateway._ledger[paper_id]['status'] = new_status
                MockFabricGateway._ledger[paper_id]['updated_at'] = timestamp

        elif function == 'RecordAccess':
            paper_id, user_id, action, ip_address, details = args
            log_id = f"LOG_{tx_id[:16]}"
            log_entry = {
                'log_id': log_id,
                'paper_id': paper_id,
                'user_id': user_id,
                'action': action,
                'ip_address': ip_address,
                'details': details,
                'timestamp': timestamp
            }
            if paper_id not in MockFabricGateway._access_logs:
                MockFabricGateway._access_logs[paper_id] = []
            MockFabricGateway._access_logs[paper_id].append(log_entry)

        return {
            'tx_id': tx_id,
            'block_number': MockFabricGateway._tx_counter,
            'status': 'SUCCESS'
        }

    def query_chaincode(self, function: str, args: list) -> Any:
        """模拟链码查询"""
        if function == 'GetPaper':
            paper_id = args[0]
            return MockFabricGateway._ledger.get(paper_id)

        if function == 'GetPaperHistory':
            paper_id = args[0]
            if paper_id in MockFabricGateway._ledger:
                paper = MockFabricGateway._ledger[paper_id]
                return [{
                    'tx_id': paper.get('tx_id', ''),
                    'timestamp': paper.get('created_at', ''),
                    'is_delete': False,
                    'paper': paper
                }]
            return []

        if function == 'GetPaperAccessLogs':
            paper_id = args[0]
            return MockFabricGateway._access_logs.get(paper_id, [])

        if function == 'GetAllPapers':
            page_size = int(args[0]) if args else 10
            papers = list(MockFabricGateway._ledger.values())
            return {
                'papers': papers[:page_size],
                'record_count': len(papers),
                'bookmark': ''
            }

        return None


# ===================== 辅助函数 =====================

def get_ipfs_service() -> IPFSService:
    """获取 IPFS 服务实例"""
    return IPFSService()


def get_blockchain_service() -> BlockchainService:
    """获取区块链服务实例"""
    return BlockchainService()
