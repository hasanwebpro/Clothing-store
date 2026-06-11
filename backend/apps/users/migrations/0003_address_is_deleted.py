from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_wishlistitem'),
    ]

    operations = [
        migrations.AddField(
            model_name='address',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
