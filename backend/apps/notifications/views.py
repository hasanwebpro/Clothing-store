"""
MVC ROLE: CONTROLLER — HTTP boundary for reading and dismissing notifications.
DESIGN PATTERN: Observer (consumer side) — these views expose the notifications
                that InAppNotificationObserver wrote via the EventBus.

SECURITY — USER-SCOPED QUERYSET:
  Every queryset is filtered to request.user. A user can ONLY see and mark
  their OWN notifications. There is no admin override here — admins get
  notifications too and should read their own.

  MarkNotificationReadView uses filter(pk=pk, user=request.user) rather
  than get(pk=pk) followed by an ownership check. This is more efficient
  (one query) and returns 404 naturally if pk doesn't belong to the user
  — preventing user enumeration (attacker probing notification IDs).

WHY THREE SEPARATE ENDPOINTS INSTEAD OF ONE?
  NotificationListView   → GET  — read all notifications (with is_read state)
  MarkNotificationReadView → PATCH — mark ONE as read (user clicked a notification)
  MarkAllReadView         → POST  — dismiss ALL (user clicked "Mark all read")

  Combining them would require the client to call GET then PATCH N times for
  "mark all read", creating N HTTP requests. The dedicated endpoint does it
  in one UPDATE ... WHERE user=X AND is_read=False query.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/v1/notifications/"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Catch up the user's in-flight orders first, so any lifecycle stage that
        # became due since the last poll has already written its notification.
        # This keeps the bell synchronized with the orders even when the user is
        # not on an order page. Import is local to avoid a startup import cycle.
        from apps.orders.services import OrderService
        OrderService().sync_user_orders(self.request.user)
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(APIView):
    """PATCH /api/v1/notifications/{id}/read/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        updated = Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
        if not updated:
            return Response({'message': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'message': 'Marked as read.'})


class MarkAllReadView(APIView):
    """POST /api/v1/notifications/read-all/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})
