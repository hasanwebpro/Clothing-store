from django.urls import path
from . import views

urlpatterns = [
    path('',               views.NotificationListView.as_view(),     name='notification-list'),
    path('<int:pk>/read/', views.MarkNotificationReadView.as_view(), name='notification-read'),
    path('read-all/',      views.MarkAllReadView.as_view(),          name='notification-read-all'),
]
