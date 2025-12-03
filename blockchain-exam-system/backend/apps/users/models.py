"""
用户模型 - 支持多角色的教育系统用户
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """自定义用户模型"""

    class Role(models.TextChoices):
        ADMIN = 'admin', '系统管理员'
        COE = 'coe', '考试中心(COE)'
        TEACHER = 'teacher', '教师'
        SUPERINTENDENT = 'superintendent', '监考人员'
        STUDENT = 'student', '学生'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        verbose_name='角色'
    )
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name='工号/学号'
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='部门/院系'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='电话'
    )

    # SM2公钥 - 用于非对称加密
    sm2_public_key = models.TextField(
        blank=True,
        verbose_name='SM2公钥'
    )

    # 密钥创建时间
    key_created_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='密钥创建时间'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER

    @property
    def is_coe(self):
        return self.role == self.Role.COE

    @property
    def is_superintendent(self):
        return self.role == self.Role.SUPERINTENDENT


class KeyPair(models.Model):
    """用户密钥对管理 - 存储加密的私钥"""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='keypair',
        verbose_name='用户'
    )

    # 加密后的SM2私钥 (使用用户密码派生的密钥加密)
    encrypted_private_key = models.TextField(
        verbose_name='加密的SM2私钥'
    )

    # 私钥加密使用的盐值
    salt = models.BinaryField(
        max_length=32,
        verbose_name='盐值'
    )

    # 密钥版本 (用于密钥轮换)
    version = models.PositiveIntegerField(
        default=1,
        verbose_name='密钥版本'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '密钥对'
        verbose_name_plural = '密钥对'
        db_table = 'user_keypairs'

    def __str__(self):
        return f"{self.user.username} 的密钥对 (v{self.version})"
