"""
考试序列化器
"""
from rest_framework import serializers
from .models import Subject, Exam, ExamPaper, PaperAccessLog


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class ExamPaperSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ExamPaper
        fields = [
            'id', 'exam', 'version', 'original_filename', 'file_size',
            'file_hash', 'ipfs_hash', 'status', 'status_display',
            'blockchain_tx_id', 'block_number', 'unlock_time',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ipfs_hash', 'encrypted_key', 'encryption_iv',
            'blockchain_tx_id', 'block_number', 'created_at', 'updated_at'
        ]


class ExamSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    assigned_teacher_name = serializers.CharField(
        source='assigned_teacher.username',
        read_only=True,
        allow_null=True
    )
    papers = ExamPaperSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'subject', 'subject_name', 'batch',
            'exam_date', 'start_time', 'end_time', 'duration_minutes',
            'status', 'status_display', 'created_by', 'created_by_name',
            'assigned_teacher', 'assigned_teacher_name', 'notes',
            'papers', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class ExamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = [
            'name', 'subject', 'batch', 'exam_date',
            'start_time', 'end_time', 'duration_minutes',
            'assigned_teacher', 'notes'
        ]


class PaperUploadSerializer(serializers.Serializer):
    """试卷上传序列化器"""
    exam_id = serializers.UUIDField()
    file = serializers.FileField()
    password = serializers.CharField(help_text='用户密码，用于获取私钥进行签名')


class PaperAccessLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PaperAccessLog
        fields = [
            'id', 'paper', 'user', 'user_name', 'action',
            'action_display', 'ip_address', 'details', 'created_at'
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    """审计日志序列化器 - 包含完整的关联信息"""
    user = serializers.SerializerMethodField()
    paper = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PaperAccessLog
        fields = [
            'id', 'paper', 'user', 'action', 'action_display',
            'ip_address', 'user_agent', 'details', 'created_at'
        ]

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'role': obj.user.role,
        }

    def get_paper(self, obj):
        return {
            'id': str(obj.paper.id),
            'original_filename': obj.paper.original_filename,
            'exam': {
                'id': str(obj.paper.exam.id),
                'name': obj.paper.exam.name,
            }
        }
