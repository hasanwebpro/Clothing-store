"""
MVC ROLE: URL CONF — maps /api/v1/support/ routes to the support controllers.
Mounted in config/urls.py. Mirrors the REST resource style used app-wide:
  POST   /support/tickets/       → create (public: Contact Support / Feedback)
  GET    /support/tickets/       → list   (staff inbox)
  PATCH  /support/tickets/{id}/  → resolve (staff)
"""
from django.urls import path
from . import views

urlpatterns = [
    path('tickets/',           views.TicketListCreateView.as_view(), name='support-ticket-list'),
    path('tickets/<int:pk>/',  views.ResolveTicketView.as_view(),    name='support-ticket-resolve'),
]
