"""
MVC ROLE: CONTROLLER — HTTP boundary for support tickets & feedback.

PERMISSIONS:
  • Create (POST) is public (AllowAny) — guests can contact support / leave
    feedback without an account. If the requester IS authenticated we link
    the ticket to their user automatically.
  • List (GET) and resolve (PATCH) are staff-only (IsSeller covers seller+admin).
"""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsSeller
from .models import SupportTicket
from .serializers import (
    SupportTicketSerializer, CreateTicketSerializer, ResolveTicketSerializer,
)


class TicketListCreateView(APIView):
    def get_permissions(self):
        # Anyone can submit; only staff can list.
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsSeller()]

    def get(self, request):
        tickets = SupportTicket.objects.all()
        kind = request.query_params.get('kind')
        if kind:
            tickets = tickets.filter(kind=kind)
        return Response(SupportTicketSerializer(tickets, many=True).data)

    def post(self, request):
        serializer = CreateTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ticket = SupportTicket.objects.create(
            user=request.user if request.user.is_authenticated else None,
            kind=data['kind'],
            name=data['name'],
            email=data['email'],
            subject=data.get('subject', ''),
            message=data['message'],
            rating=data.get('rating'),
        )
        return Response(SupportTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class ResolveTicketView(APIView):
    """PATCH /api/v1/support/tickets/{pk}/ [Admin/Seller]"""
    permission_classes = [IsSeller]

    def patch(self, request, pk):
        try:
            ticket = SupportTicket.objects.get(pk=pk)
        except SupportTicket.DoesNotExist:
            return Response({'message': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ResolveTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.status = serializer.validated_data['status']
        if serializer.validated_data.get('admin_reply'):
            ticket.admin_reply = serializer.validated_data['admin_reply']
        ticket.save()
        return Response(SupportTicketSerializer(ticket).data)
