"""
考试相关URL配置
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, ExamViewSet, ExamPaperViewSet, AuditLogViewSet

router = DefaultRouter()
router.register('subjects', SubjectViewSet, basename='subject')
router.register('exams', ExamViewSet, basename='exam')
router.register('papers', ExamPaperViewSet, basename='paper')
router.register('audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
