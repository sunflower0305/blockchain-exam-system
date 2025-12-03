from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, KeyPair


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'employee_id', 'department', 'is_active']
    list_filter = ['role', 'is_active', 'department']
    search_fields = ['username', 'email', 'employee_id']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('额外信息', {
            'fields': ('role', 'employee_id', 'department', 'phone', 'sm2_public_key', 'key_created_at')
        }),
    )


@admin.register(KeyPair)
class KeyPairAdmin(admin.ModelAdmin):
    list_display = ['user', 'version', 'created_at', 'updated_at']
    readonly_fields = ['encrypted_private_key', 'salt']
