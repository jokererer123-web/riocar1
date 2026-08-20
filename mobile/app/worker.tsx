import { Text, View } from "react-native";

export default function WorkerMobile() {
  return (
    <View style={{ flex: 1, backgroundColor: "#07080c", padding: 24 }}>
      <Text style={{ color: "#e8d48b", fontSize: 24 }}>Worker</Text>
      <Text style={{ color: "#9aa3b2", marginTop: 8 }}>
        Use the web Worker portal for camera QR scan and payment confirmation. This screen mirrors loyalty status for staff on the floor.
      </Text>
    </View>
  );
}
