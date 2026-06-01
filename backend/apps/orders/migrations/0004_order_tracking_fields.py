from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_alter_order_payment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='estimated_delivery',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='rider_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='order',
            name='tracking_note',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
