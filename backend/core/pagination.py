"""
DESIGN PATTERN: Template Method (DRF's PageNumberPagination extension)
MVC ROLE: Controller support layer — pagination sits between the Controller
          (View) and the serialized data before the final Response is built.

WHAT PAGINATION SOLVES:
-----------------------
Without pagination, GET /products/ would return ALL products in a single
JSON response. With 15,000+ products this means:
  • Database: full table scan, gigabytes of data transferred
  • Server: serializing thousands of objects in one shot
  • Browser: parsing a 50 MB JSON response, likely crashing

PATTERN: TEMPLATE METHOD
-------------------------
DRF's PageNumberPagination defines the skeleton algorithm for paginating
a queryset. We override only the parts we want to customise:
  - page_size, page_size_query_param, max_page_size → change the numbers
  - get_paginated_response() → change the JSON envelope shape

This is the Template Method pattern: parent defines structure, children
fill in the specifics.

OUR ENVELOPE SHAPE:
  {
    "pagination": {
      "count": 350,
      "total_pages": 18,
      "current_page": 2,
      "next": "http://...?page=3",
      "previous": "http://...?page=1"
    },
    "results": [...]
  }

WHY A CUSTOM ENVELOPE?
  The default DRF envelope uses "count", "next", "previous", "results"
  at the top level. Our envelope nests pagination metadata under a
  "pagination" key so the React code can destructure it cleanly:
    const { pagination, results } = response.data

CONFIGURED IN:
  config/settings/base.py → REST_FRAMEWORK['DEFAULT_PAGINATION_CLASS']
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """Default 20 items per page, max 100."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'pagination': {
                'count': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
            },
            'results': data,
        })


class LargeResultsPagination(PageNumberPagination):
    """50 items per page — for admin list views."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
