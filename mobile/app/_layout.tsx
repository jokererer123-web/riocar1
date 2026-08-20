import { Stack } from "expo-router";
export default function Root() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#07080c" }, headerTintColor: "#c9a227" }}>
      <Stack.Screen name="index" options={{ title: "Rio" }} />
      <Stack.Screen name="auth" options={{ title: "Auth" }} />
    </Stack>
  );
}
