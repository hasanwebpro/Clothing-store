from django.contrib import admin
from .models import SupportTicket


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'kind', 'name', 'email', 'subject', 'rating', 'status', 'created_at')
    list_filter = ('kind', 'status')
    search_fields = ('name', 'email', 'subject', 'message')
