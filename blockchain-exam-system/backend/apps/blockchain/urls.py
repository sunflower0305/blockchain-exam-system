"""
区块链相关URL配置
"""
from django.urls import path
from .views import (
    BlockchainStatusView,
    PaperBlockchainView,
    PaperHistoryView,
    VerifyPaperView,
    AllBlockchainRecordsView,
    PaperAccessLogsView,
    BlockchainStatsView,
)

urlpatterns = [
    path('status/', BlockchainStatusView.as_view(), name='blockchain-status'),
    path('stats/', BlockchainStatsView.as_view(), name='blockchain-stats'),
    path('records/', AllBlockchainRecordsView.as_view(), name='blockchain-records'),
    path('paper/<str:paper_id>/', PaperBlockchainView.as_view(), name='paper-blockchain'),
    path('paper/<str:paper_id>/history/', PaperHistoryView.as_view(), name='paper-history'),
    path('paper/<str:paper_id>/access-logs/', PaperAccessLogsView.as_view(), name='paper-access-logs'),
    path('verify/', VerifyPaperView.as_view(), name='verify-paper'),
]
