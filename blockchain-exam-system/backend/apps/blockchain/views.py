"""
区块链相关视图
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator

from .services import BlockchainService, IPFSService, get_blockchain_service, get_ipfs_service
from apps.exams.models import ExamPaper, PaperAccessLog


class AllBlockchainRecordsView(APIView):
    """获取所有区块链记录 - 公开可查"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """获取所有已上链的试卷记录"""
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        search = request.query_params.get('search', '')

        # 获取所有已上链的试卷
        queryset = ExamPaper.objects.filter(
            status__in=['on_chain', 'selected', 'decrypted'],
            blockchain_tx_id__isnull=False
        ).exclude(blockchain_tx_id='').select_related(
            'exam', 'exam__subject', 'uploaded_by'
        ).order_by('-created_at')

        # 搜索过滤
        if search:
            queryset = queryset.filter(
                exam__name__icontains=search
            ) | queryset.filter(
                exam__subject__name__icontains=search
            ) | queryset.filter(
                blockchain_tx_id__icontains=search
            )

        # 分页
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        # 序列化数据
        records = []
        for paper in page_obj:
            records.append({
                'id': str(paper.id),
                'exam': {
                    'id': str(paper.exam.id),
                    'name': paper.exam.name,
                    'subject': paper.exam.subject.name,
                    'exam_date': paper.exam.exam_date.isoformat(),
                },
                'version': paper.version,
                'file_hash': paper.file_hash,
                'ipfs_hash': paper.ipfs_hash,
                'blockchain_tx_id': paper.blockchain_tx_id,
                'block_number': paper.block_number,
                'status': paper.status,
                'uploaded_by': paper.uploaded_by.username,
                'unlock_time': paper.unlock_time.isoformat() if paper.unlock_time else None,
                'created_at': paper.created_at.isoformat(),
            })

        return Response({
            'records': records,
            'total': paginator.count,
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
        })


class PaperAccessLogsView(APIView):
    """获取试卷的访问日志"""
    permission_classes = [IsAuthenticated]

    def get(self, request, paper_id):
        """获取试卷的完整访问日志"""
        logs = PaperAccessLog.objects.filter(
            paper_id=paper_id
        ).select_related('user').order_by('-created_at')

        result = []
        for log in logs:
            result.append({
                'id': log.id,
                'user': {
                    'id': log.user.id,
                    'username': log.user.username,
                },
                'action': log.action,
                'ip_address': log.ip_address,
                'details': log.details,
                'created_at': log.created_at.isoformat(),
            })

        return Response(result)


class BlockchainStatsView(APIView):
    """区块链统计信息"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """获取区块链统计数据"""
        total_on_chain = ExamPaper.objects.filter(
            status__in=['on_chain', 'selected', 'decrypted'],
            blockchain_tx_id__isnull=False
        ).exclude(blockchain_tx_id='').count()

        total_logs = PaperAccessLog.objects.count()

        # 按操作类型统计
        action_stats = {}
        for action in PaperAccessLog.Action.choices:
            action_stats[action[0]] = PaperAccessLog.objects.filter(
                action=action[0]
            ).count()

        # 获取区块链网络信息
        blockchain_service = get_blockchain_service()
        network_info = blockchain_service.get_network_info()

        return Response({
            'total_on_chain': total_on_chain,
            'total_access_logs': total_logs,
            'action_stats': action_stats,
            'ledger_height': network_info.get('ledger_height', 0),
            'network_mode': network_info.get('mode', 'unknown'),
        })


class BlockchainStatusView(APIView):
    """区块链和IPFS状态检查"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """获取区块链和IPFS的详细状态"""
        blockchain_service = get_blockchain_service()
        ipfs_service = get_ipfs_service()

        # 获取区块链网络信息
        blockchain_info = blockchain_service.get_network_info()

        # 获取IPFS节点信息
        ipfs_info = ipfs_service.get_node_info()

        return Response({
            'blockchain': {
                'connected': blockchain_info.get('connected', False),
                'mode': blockchain_info.get('mode', 'unknown'),
                'network': blockchain_info.get('network', 'Hyperledger Fabric'),
                'channel': blockchain_info.get('channel', ''),
                'chaincode': blockchain_info.get('chaincode', ''),
                'msp_id': blockchain_info.get('msp_id', ''),
                'peer_endpoint': blockchain_info.get('peer_endpoint', ''),
                'ledger_height': blockchain_info.get('ledger_height', 0),
                'lastSync': blockchain_info.get('last_sync', ''),
            },
            'ipfs': {
                'connected': ipfs_info.get('connected', False),
                'mode': ipfs_info.get('mode', 'unknown'),
                'host': f"{ipfs_info.get('host', '')}:{ipfs_info.get('port', '')}",
                'gateway': f"{ipfs_info.get('host', '')}:8080",
                'version': ipfs_info.get('version', ''),
                'peer_id': ipfs_info.get('peer_id', ''),
                'storage': '可用' if ipfs_info.get('connected') else '不可用',
            }
        })


class PaperBlockchainView(APIView):
    """试卷区块链信息"""
    permission_classes = [IsAuthenticated]

    def get(self, request, paper_id):
        """获取试卷的区块链信息"""
        blockchain_service = get_blockchain_service()
        paper_info = blockchain_service.get_paper(paper_id)

        if not paper_info:
            # 尝试从数据库获取
            try:
                paper = ExamPaper.objects.get(id=paper_id)
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
            except ExamPaper.DoesNotExist:
                return Response(
                    {"error": "试卷未找到"},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(paper_info)


class PaperHistoryView(APIView):
    """试卷历史记录"""
    permission_classes = [IsAuthenticated]

    def get(self, request, paper_id):
        """获取试卷的区块链历史"""
        blockchain_service = get_blockchain_service()
        history = blockchain_service.get_paper_history(paper_id)

        # 如果区块链没有历史，从数据库补充
        if not history:
            try:
                paper = ExamPaper.objects.get(id=paper_id)
                history = [{
                    'tx_id': paper.blockchain_tx_id or '',
                    'timestamp': paper.created_at.isoformat(),
                    'is_delete': False,
                    'paper': {
                        'paper_id': str(paper.id),
                        'status': paper.status,
                        'ipfs_hash': paper.ipfs_hash,
                        'file_hash': paper.file_hash,
                    },
                    'source': 'database'
                }]
            except ExamPaper.DoesNotExist:
                pass

        return Response(history)


class VerifyPaperView(APIView):
    """验证试卷完整性"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """验证试卷哈希"""
        paper_id = request.data.get('paper_id')
        expected_hash = request.data.get('file_hash')

        if not paper_id or not expected_hash:
            return Response(
                {"error": "请提供 paper_id 和 file_hash"},
                status=status.HTTP_400_BAD_REQUEST
            )

        blockchain_service = get_blockchain_service()
        result = blockchain_service.verify_paper(paper_id, expected_hash)

        return Response({
            'paper_id': paper_id,
            'is_valid': result.get('valid', False),
            'message': result.get('message', ''),
            'paper_info': result.get('paper_info'),
        })


class BlockchainPapersView(APIView):
    """从区块链获取试卷列表"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """获取区块链上的所有试卷"""
        page_size = int(request.query_params.get('page_size', 10))
        bookmark = request.query_params.get('bookmark', '')

        blockchain_service = get_blockchain_service()
        result = blockchain_service.get_all_papers(page_size, bookmark)

        return Response(result)
