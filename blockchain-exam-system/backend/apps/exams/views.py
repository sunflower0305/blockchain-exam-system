"""
考试视图
"""
import hashlib
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db import transaction

from .models import Subject, Exam, ExamPaper, PaperAccessLog
from .serializers import (
    SubjectSerializer,
    ExamSerializer,
    ExamCreateSerializer,
    ExamPaperSerializer,
    PaperUploadSerializer,
    PaperAccessLogSerializer,
    AuditLogSerializer,
)
from utils.crypto import GMCrypto
from apps.blockchain.services import BlockchainService, IPFSService


class SubjectViewSet(viewsets.ModelViewSet):
    """科目管理"""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class ExamViewSet(viewsets.ModelViewSet):
    """考试管理"""
    queryset = Exam.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return ExamCreateSerializer
        return ExamSerializer

    def get_queryset(self):
        user = self.request.user
        # 根据角色过滤
        if user.role == user.Role.COE or user.role == user.Role.ADMIN:
            return self.queryset
        elif user.role == user.Role.TEACHER:
            return self.queryset.filter(assigned_teacher=user)
        elif user.role == user.Role.SUPERINTENDENT:
            return self.queryset.filter(status__in=[
                Exam.Status.READY, Exam.Status.ONGOING
            ])
        return Exam.objects.none()

    def perform_create(self, serializer):
        # 如果创建时指定了教师，自动将状态设为 REQUESTING
        assigned_teacher = serializer.validated_data.get('assigned_teacher')
        if assigned_teacher:
            serializer.save(
                created_by=self.request.user,
                status=Exam.Status.REQUESTING
            )
        else:
            serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def assign_teacher(self, request, pk=None):
        """COE指定出题教师"""
        exam = self.get_object()
        teacher_id = request.data.get('teacher_id')

        if not teacher_id:
            return Response(
                {"error": "请指定教师"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            teacher = User.objects.get(id=teacher_id, role=User.Role.TEACHER)
        except User.DoesNotExist:
            return Response(
                {"error": "教师不存在"},
                status=status.HTTP_404_NOT_FOUND
            )

        exam.assigned_teacher = teacher
        exam.status = Exam.Status.REQUESTING
        exam.save()

        return Response({"message": "已指定出题教师"})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """COE批准试卷"""
        exam = self.get_object()
        paper_id = request.data.get('paper_id')

        if not paper_id:
            return Response(
                {"error": "请指定试卷"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            paper = exam.papers.get(id=paper_id)
        except ExamPaper.DoesNotExist:
            return Response(
                {"error": "试卷不存在"},
                status=status.HTTP_404_NOT_FOUND
            )

        paper.status = ExamPaper.Status.SELECTED
        paper.save()

        exam.status = Exam.Status.APPROVED
        exam.save()

        return Response({"message": "试卷已批准"})

    @action(detail=True, methods=['post'])
    def set_ready(self, request, pk=None):
        """COE设置考试为待考试状态"""
        exam = self.get_object()

        # 验证权限
        if request.user.role not in ['admin', 'coe']:
            return Response(
                {"error": "无权限执行此操作"},
                status=status.HTTP_403_FORBIDDEN
            )

        # 验证状态
        if exam.status != Exam.Status.APPROVED:
            return Response(
                {"error": "只有已批准的考试才能设为待考试状态"},
                status=status.HTTP_400_BAD_REQUEST
            )

        exam.status = Exam.Status.READY
        exam.save()

        return Response({"message": "考试已设为待考试状态"})


class ExamPaperViewSet(viewsets.ModelViewSet):
    """试卷管理"""
    queryset = ExamPaper.objects.all()
    serializer_class = ExamPaperSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        exam_id = self.request.query_params.get('exam_id')

        qs = self.queryset
        if exam_id:
            qs = qs.filter(exam_id=exam_id)

        # 教师只能看自己上传的
        if user.role == user.Role.TEACHER:
            qs = qs.filter(uploaded_by=user)

        return qs

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        上传试卷 - 核心流程:
        1. 接收文件
        2. 计算原始文件哈希
        3. 使用SM4加密文件
        4. 上传加密文件到IPFS
        5. 将哈希和元数据上链
        """
        serializer = PaperUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        exam_id = serializer.validated_data['exam_id']
        file = serializer.validated_data['file']
        password = serializer.validated_data['password']

        # 验证密码
        if not request.user.check_password(password):
            return Response(
                {"error": "密码错误"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 验证考试
        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            return Response(
                {"error": "考试不存在"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 验证权限
        if request.user != exam.assigned_teacher:
            return Response(
                {"error": "您不是该考试的指定出题教师"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            with transaction.atomic():
                # 读取文件内容
                file_content = file.read()
                file_size = len(file_content)

                # 计算原始文件哈希
                file_hash = hashlib.sha256(file_content).hexdigest()

                # 初始化加密服务
                crypto = GMCrypto()

                # 生成SM4密钥和IV
                sm4_key = crypto.generate_sm4_key()
                sm4_iv = crypto.generate_iv()

                # SM4加密文件
                encrypted_content = crypto.sm4_encrypt(file_content, sm4_key, sm4_iv)

                # 获取用户私钥解密（从数据库获取加密的私钥）
                # 然后用COE的公钥加密SM4密钥
                # 这里简化处理，实际需要更复杂的密钥管理
                encrypted_key = crypto.sm2_encrypt(sm4_key, request.user.sm2_public_key)

                # 上传到IPFS
                ipfs_service = IPFSService()
                ipfs_hash = ipfs_service.upload(encrypted_content)

                # 计算版本号
                version = exam.papers.count() + 1

                # 创建试卷记录
                paper = ExamPaper.objects.create(
                    exam=exam,
                    version=version,
                    original_filename=file.name,
                    file_size=file_size,
                    file_hash=file_hash,
                    ipfs_hash=ipfs_hash,
                    encrypted_key=encrypted_key.hex(),
                    encryption_iv=sm4_iv.hex(),
                    unlock_time=timezone.make_aware(
                        timezone.datetime.combine(exam.exam_date, exam.start_time)
                    ),
                    status=ExamPaper.Status.UPLOADED,
                    uploaded_by=request.user
                )

                # 上链
                blockchain_service = BlockchainService()
                tx_result = blockchain_service.store_paper(
                    paper_id=str(paper.id),
                    exam_id=str(exam.id),
                    ipfs_hash=ipfs_hash,
                    file_hash=file_hash,
                    unlock_time=paper.unlock_time.isoformat()
                )

                # 更新区块链信息
                paper.blockchain_tx_id = tx_result.get('tx_id', '')
                paper.block_number = tx_result.get('block_number')
                paper.status = ExamPaper.Status.ON_CHAIN
                paper.save()

                # 记录日志
                PaperAccessLog.objects.create(
                    paper=paper,
                    user=request.user,
                    action=PaperAccessLog.Action.UPLOAD,
                    ip_address=self._get_client_ip(request),
                    details={
                        'filename': file.name,
                        'size': file_size,
                        'ipfs_hash': ipfs_hash
                    }
                )

                # 更新考试状态
                exam.status = Exam.Status.SUBMITTED
                exam.save()

                return Response({
                    "message": "试卷上传成功",
                    "paper_id": str(paper.id),
                    "ipfs_hash": ipfs_hash,
                    "tx_id": paper.blockchain_tx_id
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"上传失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def decrypt(self, request, pk=None):
        """
        解密试卷 - 仅在考试时间到达后可用
        """
        paper = self.get_object()

        # 验证时间锁
        if paper.unlock_time and timezone.now() < paper.unlock_time:
            return Response(
                {"error": f"试卷将在 {paper.unlock_time} 后解锁"},
                status=status.HTTP_403_FORBIDDEN
            )

        # 验证权限（只有监考人员可以解密）
        if request.user.role not in ['superintendent', 'admin', 'coe']:
            return Response(
                {"error": "无权限解密试卷"},
                status=status.HTTP_403_FORBIDDEN
            )

        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response(
                {"error": "密码错误"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            crypto = GMCrypto()
            ipfs_service = IPFSService()

            # 从IPFS获取加密文件
            encrypted_content = ipfs_service.download(paper.ipfs_hash)

            # 解密SM4密钥（需要用户私钥）
            # 这里简化处理
            user_private_key = crypto.get_user_private_key(request.user, password)
            sm4_key = crypto.sm2_decrypt(
                bytes.fromhex(paper.encrypted_key),
                user_private_key
            )

            # 解密文件
            decrypted_content = crypto.sm4_decrypt(
                encrypted_content,
                sm4_key,
                bytes.fromhex(paper.encryption_iv)
            )

            # 验证哈希
            if hashlib.sha256(decrypted_content).hexdigest() != paper.file_hash:
                return Response(
                    {"error": "文件完整性验证失败"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # 记录日志
            PaperAccessLog.objects.create(
                paper=paper,
                user=request.user,
                action=PaperAccessLog.Action.DECRYPT,
                ip_address=self._get_client_ip(request)
            )

            # 更新状态
            paper.status = ExamPaper.Status.DECRYPTED
            paper.save()

            # 返回解密后的文件（base64编码）
            import base64
            return Response({
                "filename": paper.original_filename,
                "content": base64.b64encode(decrypted_content).decode('utf-8'),
                "hash_verified": True
            })

        except Exception as e:
            return Response(
                {"error": f"解密失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def audit_logs(self, request, pk=None):
        """获取试卷的审计日志"""
        paper = self.get_object()
        logs = paper.access_logs.all()
        serializer = PaperAccessLogSerializer(logs, many=True)
        return Response(serializer.data)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """审计日志视图集 - 只读"""
    queryset = PaperAccessLog.objects.all().select_related(
        'paper', 'paper__exam', 'user'
    ).order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # 只有管理员和COE可以查看所有审计日志
        if user.role not in ['admin', 'coe']:
            return PaperAccessLog.objects.none()

        qs = self.queryset

        # 按操作类型过滤
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        # 按日期过滤
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(created_at__date=date)

        return qs
