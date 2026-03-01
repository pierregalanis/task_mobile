import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function TaskerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="manage-services" />
      <Stack.Screen name="my-reviews" />
      <Stack.Screen name="my-earnings" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
