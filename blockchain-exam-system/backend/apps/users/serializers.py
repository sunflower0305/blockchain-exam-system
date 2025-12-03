"""
用户序列化器
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """用户基本信息序列化器"""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'employee_id',
            'department', 'phone', 'sm2_public_key', 'key_created_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sm2_public_key', 'key_created_at', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    """用户注册序列化器"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'role', 'employee_id', 'department', 'phone'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "两次密码不一致"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """修改密码序列化器"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("原密码错误")
        return value


class GenerateKeyPairSerializer(serializers.Serializer):
    """生成密钥对序列化器"""
    password = serializers.CharField(required=True, help_text="用户密码，用于加密私钥")
