from django.urls import path
from . import views

urlpatterns = [
    path('initiate/',              views.InitiatePaymentView.as_view(),  name='payment-initiate'),
    path('callback/',              views.PaymentCallbackView.as_view(),  name='payment-callback'),
    path('easypaisa-info/',        views.EasypaisaInfoView.as_view(),    name='easypaisa-info'),
    path('<int:order_id>/status/', views.PaymentStatusView.as_view(),    name='payment-status'),
]
