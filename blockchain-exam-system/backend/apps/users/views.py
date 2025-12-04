"""
用户视图
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    ChangePasswordSerializer,
    GenerateKeyPairSerializer,
)
from utils.crypto import GMCrypto

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """用户管理视图集"""
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = self.queryset
        # 支持按角色过滤
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    @action(detail=False, methods=['get'])
    def me(self, request):
        """获取当前用户信息"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """修改密码"""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        return Response({"message": "密码修改成功"})

    @action(detail=False, methods=['post'])
    def generate_keypair(self, request):
        """
        为用户生成SM2密钥对
        - 公钥存储在用户表
        - 私钥使用用户密码派生的密钥加密后存储
        """
        serializer = GenerateKeyPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = serializer.validated_data['password']

        # 验证密码
        if not request.user.check_password(password):
            return Response(
                {"error": "密码错误"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            crypto = GMCrypto()
            result = crypto.generate_keypair_for_user(request.user, password)

            return Response({
                "message": "密钥对生成成功",
                "public_key": result['public_key'],
                "key_created_at": result['created_at']
            })
        except Exception as e:
            return Response(
                {"error": f"密钥生成失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def public_key(self, request):
        """获取当前用户的公钥"""
        if not request.user.sm2_public_key:
            return Response(
                {"error": "用户尚未生成密钥对"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "public_key": request.user.sm2_public_key,
            "created_at": request.user.key_created_at
        })


class TeacherViewSet(viewsets.ReadOnlyModelViewSet):
    """教师列表视图（供COE查看）"""
    queryset = User.objects.filter(role=User.Role.TEACHER)
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 只有COE和管理员可以查看教师列表
        user = self.request.user
        if user.role in [User.Role.COE, User.Role.ADMIN]:
            return self.queryset
        return User.objects.none()
