import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';
import toast from 'react-hot-toast';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders().then((r) => r.data?.results || r.data || []),
  });
}

export function useOrder(orderNumber) {
  return useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => ordersApi.getOrder(orderNumber).then((r) => r.data),
    enabled: !!orderNumber,
    refetchInterval: 30000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      toast.success('Order cancelled successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not cancel order'),
  });
}
