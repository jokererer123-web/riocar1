import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput } from "react-native";
import { dict } from "../lib/i18n";
import { supabase } from "../lib/supabase";

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `996${digits.slice(1)}` : digits;
};

export default function Auth() {
  const copy = dict.ky;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("register");

  const go = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 9 || password.length < 6 || (mode === "register" && !fullName.trim())) {
      setMsg("Атыңызды, туура телефонду жана кеминде 6 белгиден турган сырсөздү киргизиңиз.");
      return;
    }
    if (!supabase) { setMsg("Demo mode: Supabase environment variables are not configured."); return; }

    setBusy(true); setMsg("");
    const email = `${normalizedPhone}@rio-customers.local`;
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { phone: normalizedPhone, full_name: fullName.trim() } },
      });
      if (error) setMsg(error.message);
      else if (data.session) router.replace("/");
      else setMsg("Каттоо бүттү. Кирүү үчүн аккаунтуңузду ырастап коюңуз.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else router.replace("/");
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={st.wrap}>
      <Text style={st.eyebrow}>RIO LOYALTY</Text>
      <Text style={st.h}>{mode === "register" ? copy.register : copy.login}</Text>
      {mode === "register" && <TextInput placeholder={copy.fullName} placeholderTextColor="#747a85" style={st.input} value={fullName} onChangeText={setFullName} autoComplete="name" />}
      <TextInput placeholder="+996 505 696 797" placeholderTextColor="#747a85" style={st.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      <TextInput placeholder={copy.password} placeholderTextColor="#747a85" style={st.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "login" ? "current-password" : "new-password"} />
      <Pressable style={[st.btn, busy && st.disabled]} onPress={go} disabled={busy}>
        {busy ? <ActivityIndicator color="#140f04" /> : <Text style={st.btnT}>{mode === "register" ? copy.register : copy.login}</Text>}
      </Pressable>
      <Pressable disabled={busy} onPress={() => { setMode(mode === "register" ? "login" : "register"); setMsg(""); }}>
        <Text style={st.link}>{mode === "register" ? copy.login : copy.register}</Text>
      </Pressable>
      {!!msg && <Text accessibilityLiveRegion="polite" style={st.msg}>{msg}</Text>}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#07080c", padding: 24, justifyContent: "center" },
  eyebrow: { color: "#c9a227", letterSpacing: 4, fontSize: 10, marginBottom: 12 },
  h: { color: "#f4f1ea", fontSize: 34, marginBottom: 28 },
  input: { borderWidth: 1, borderColor: "rgba(201,162,39,0.3)", backgroundColor: "#0c0e14", color: "#f4f1ea", padding: 14, borderRadius: 8, marginBottom: 12 },
  btn: { minHeight: 50, backgroundColor: "#c9a227", padding: 14, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 4 },
  disabled: { opacity: 0.6 },
  btnT: { color: "#140f04", fontWeight: "600" },
  link: { color: "#c9a227", marginTop: 20, textAlign: "center" },
  msg: { color: "#9aa3b2", marginTop: 18, lineHeight: 20, textAlign: "center" },
});
