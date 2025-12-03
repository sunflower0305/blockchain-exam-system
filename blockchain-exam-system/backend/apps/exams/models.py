"""
考试与试卷模型
"""
from django.db import models
from django.conf import settings
import uuid


class Subject(models.Model):
    """科目"""
    name = models.CharField(max_length=100, unique=True, verbose_name='科目名称')
    code = models.CharField(max_length=20, unique=True, verbose_name='科目代码')
    department = models.CharField(max_length=100, verbose_name='所属院系')
    description = models.TextField(blank=True, verbose_name='描述')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '科目'
        verbose_name_plural = '科目'
        db_table = 'subjects'

    def __str__(self):
        return f"{self.code} - {self.name}"


class Exam(models.Model):
    """考试"""

    class Status(models.TextChoices):
        DRAFT = 'draft', '草稿'
        REQUESTING = 'requesting', '请求出题中'
        SUBMITTED = 'submitted', '已提交试卷'
        APPROVED = 'approved', '已批准'
        ENCRYPTED = 'encrypted', '已加密上链'
        READY = 'ready', '待考试'
        ONGOING = 'ongoing', '考试中'
        FINISHED = 'finished', '已结束'
        ARCHIVED = 'archived', '已归档'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name='考试名称')
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        related_name='exams',
        verbose_name='科目'
    )
    batch = models.CharField(max_length=50, verbose_name='考试批次')

    # 考试时间设置
    exam_date = models.DateField(verbose_name='考试日期')
    start_time = models.TimeField(verbose_name='开始时间')
    end_time = models.TimeField(verbose_name='结束时间')
    duration_minutes = models.PositiveIntegerField(verbose_name='考试时长(分钟)')

    # 状态
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='状态'
    )

    # 相关人员
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_exams',
        verbose_name='创建人(COE)'
    )
    assigned_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='assigned_exams',
        null=True,
        blank=True,
        verbose_name='指定出题教师'
    )

    # 备注
    notes = models.TextField(blank=True, verbose_name='备注')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '考试'
        verbose_name_plural = '考试'
        db_table = 'exams'
        ordering = ['-exam_date', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.batch})"


class ExamPaper(models.Model):
    """试卷 - 核心实体，关联区块链和IPFS"""

    class Status(models.TextChoices):
        DRAFT = 'draft', '草稿'
        UPLOADED = 'uploaded', '已上传IPFS'
        ENCRYPTED = 'encrypted', '已加密'
        ON_CHAIN = 'on_chain', '已上链'
        SELECTED = 'selected', '已选定'
        DECRYPTED = 'decrypted', '已解密(考试中)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='papers',
        verbose_name='考试'
    )
    version = models.PositiveIntegerField(default=1, verbose_name='版本号')

    # 原始文件信息
    original_filename = models.CharField(max_length=255, verbose_name='原始文件名')
    file_size = models.PositiveBigIntegerField(verbose_name='文件大小(bytes)')
    file_hash = models.CharField(max_length=128, verbose_name='原始文件哈希')

    # IPFS存储
    ipfs_hash = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='IPFS哈希(加密后)'
    )

    # 加密信息
    encrypted_key = models.TextField(
        blank=True,
        verbose_name='加密的对称密钥(SM4)'
    )
    encryption_iv = models.CharField(
        max_length=64,
        blank=True,
        verbose_name='加密IV'
    )

    # 时间锁定
    unlock_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='解锁时间'
    )

    # 区块链信息
    blockchain_tx_id = models.CharField(
        max_length=128,
        blank=True,
        verbose_name='区块链交易ID'
    )
    block_number = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        verbose_name='区块号'
    )

    # 状态
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='状态'
    )

    # 上传者
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='uploaded_papers',
        verbose_name='上传者'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '试卷'
        verbose_name_plural = '试卷'
        db_table = 'exam_papers'
        ordering = ['-created_at']
        unique_together = ['exam', 'version']

    def __str__(self):
        return f"{self.exam.name} - v{self.version}"


class PaperAccessLog(models.Model):
    """试卷访问日志 - 用于审计"""

    class Action(models.TextChoices):
        UPLOAD = 'upload', '上传'
        ENCRYPT = 'encrypt', '加密'
        CHAIN = 'chain', '上链'
        VIEW = 'view', '查看'
        DOWNLOAD = 'download', '下载'
        DECRYPT = 'decrypt', '解密'

    paper = models.ForeignKey(
        ExamPaper,
        on_delete=models.CASCADE,
        related_name='access_logs',
        verbose_name='试卷'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='paper_access_logs',
        verbose_name='操作用户'
    )
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        verbose_name='操作类型'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP地址'
    )
    user_agent = models.TextField(blank=True, verbose_name='User Agent')
    details = models.JSONField(default=dict, verbose_name='详细信息')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='操作时间')

    class Meta:
        verbose_name = '访问日志'
        verbose_name_plural = '访问日志'
        db_table = 'paper_access_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.get_action_display()} - {self.paper}"
