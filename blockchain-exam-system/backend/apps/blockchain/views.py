"""
区块链相关视图
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator

from .services import BlockchainService, IPFSService
from apps.exams.models import ExamPaper, PaperAccessLog


class AllBlockchainRecordsView(APIView):
    """获取所有区块链记录 - 公开可查"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """获取所有已上链的试卷记��"""
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

        return Response({
            'total_on_chain': total_on_chain,
            'total_access_logs': total_logs,
            'action_stats': action_stats,
        })


class BlockchainStatusView(APIView):
    """区块链状态检查"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        blockchain_service = BlockchainService()
        ipfs_service = IPFSService()

        return Response({
            'blockchain': {
                'connected': True,  # 实际需要检查连接状态
                'channel': blockchain_service.config.get('CHANNEL_NAME'),
                'chaincode': blockchain_service.config.get('CHAINCODE_NAME'),
            },
            'ipfs': {
                'connected': True,
                'host': ipfs_service.host,
                'port': ipfs_service.port,
            }
        })


class PaperBlockchainView(APIView):
    """试卷区块链信息"""
    permission_classes = [IsAuthenticated]

    def get(self, request, paper_id):
        """获取试卷的区块链信息"""
        blockchain_service = BlockchainService()
        paper_info = blockchain_service.get_paper(paper_id)

        if not paper_info:
            return Response(
                {"error": "区块链上未找到该试卷"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(paper_info)


class PaperHistoryView(APIView):
    """试卷历史记录"""
    permission_classes = [IsAuthenticated]

    def get(self, request, paper_id):
        """获取试卷的区块链历史"""
        blockchain_service = BlockchainService()
        history = blockchain_service.get_paper_history(paper_id)
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

        blockchain_service = BlockchainService()
        is_valid = blockchain_service.verify_paper(paper_id, expected_hash)

        return Response({
            'paper_id': paper_id,
            'is_valid': is_valid,
            'message': '验证通过' if is_valid else '验证失败'
        })
