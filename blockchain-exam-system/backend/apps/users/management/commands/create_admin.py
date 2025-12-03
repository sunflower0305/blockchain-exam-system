"""
创建管理员用户的管理命令
用法: python manage.py create_admin --username admin --password admin123 --email admin@example.com
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = '创建系统管理员用户'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='管理员用户名 (默认: admin)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='管理员密码 (默认: admin123)'
        )
        parser.add_argument(
            '--email',
            type=str,
            default='admin@example.com',
            help='管理员邮箱 (默认: admin@example.com)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='如果用户已存在，强制更新密码'
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']
        force = options['force']

        try:
            user = User.objects.get(username=username)
            if force:
                user.set_password(password)
                user.email = email
                user.role = User.Role.ADMIN
                user.is_staff = True
                user.is_superuser = True
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'管理员用户 "{username}" 已更新')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'用户 "{username}" 已存在，使用 --force 参数覆盖')
                )
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=User.Role.ADMIN,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(
                self.style.SUCCESS(f'管理员用户 "{username}" 创建成功')
            )

        self.stdout.write(f'用户名: {username}')
        self.stdout.write(f'邮箱: {email}')
        self.stdout.write(f'角色: 系统管理员')
