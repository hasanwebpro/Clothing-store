from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'

    def ready(self):
        """
        Register event observers here so they are active as soon as Django starts.
        SDA Note: AppConfig.ready() is the standard Django hook for startup logic.
        """
        from core.events import EventBus, Events
        from apps.notifications.observers import (
            EmailNotificationObserver,
            InAppNotificationObserver,
        )
        from apps.inventory.observers import InventoryObserver

        EventBus.subscribe(Events.ORDER_PLACED, EmailNotificationObserver())
        EventBus.subscribe(Events.ORDER_PLACED, InAppNotificationObserver())
        EventBus.subscribe(Events.ORDER_PLACED, InventoryObserver())
        EventBus.subscribe(Events.ORDER_STATUS_CHANGED, EmailNotificationObserver())
        EventBus.subscribe(Events.ORDER_STATUS_CHANGED, InAppNotificationObserver())
