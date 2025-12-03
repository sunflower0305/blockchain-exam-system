from django.contrib import admin
from .models import Subject, Exam, ExamPaper, PaperAccessLog


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'department', 'created_at']
    search_fields = ['code', 'name']
    list_filter = ['department']


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'batch', 'exam_date', 'status', 'assigned_teacher']
    list_filter = ['status', 'subject', 'exam_date']
    search_fields = ['name', 'batch']
    date_hierarchy = 'exam_date'


@admin.register(ExamPaper)
class ExamPaperAdmin(admin.ModelAdmin):
    list_display = ['exam', 'version', 'status', 'ipfs_hash', 'blockchain_tx_id', 'uploaded_by']
    list_filter = ['status', 'exam__subject']
    search_fields = ['exam__name', 'ipfs_hash', 'blockchain_tx_id']
    readonly_fields = ['encrypted_key', 'encryption_iv']


@admin.register(PaperAccessLog)
class PaperAccessLogAdmin(admin.ModelAdmin):
    list_display = ['paper', 'user', 'action', 'ip_address', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['paper__exam__name', 'user__username']
    readonly_fields = ['paper', 'user', 'action', 'ip_address', 'user_agent', 'details', 'created_at']
