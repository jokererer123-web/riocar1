import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { dict } from "../lib/i18n";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const copy = dict.ky;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");

  const emailFromPhone = (p: string) => `${p.replace(/\D/g, "")}@rio-customers.local`;

  const go = async () => {
    if (!supabase) {
      setMsg("Demo: unique phone check is enforced in production via profiles.phone UNIQUE.");
      return;
    }
    const email = emailFromPhone(phone);
    if (mode === "register") {
      const { data: existing } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
      if (existing) {
        setMsg("Phone already registered.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error || !data.user) {
        setMsg(error?.message || "signup failed");
        return;
      }
      const { error: pErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        phone,
        full_name: fullName,
        role: "customer",
      });
      setMsg(pErr ? pErr.message : "OK");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMsg(error ? error.message : "OK");
    }
  };

  return (
    <SafeAreaView style={st.wrap}>
      <Text style={st.h}>{mode === "register" ? copy.register : copy.login}</Text>
      {mode === "register" ? (
        <TextInput placeholder={copy.fullName} placeholderTextColor="#9aa3b2" style={st.in} value={fullName} onChangeText={setFullName} />
      ) : null}
      <TextInput placeholder={copy.phoneLabel} placeholderTextColor="#9aa3b2" style={st.in} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput placeholder={copy.password} placeholderTextColor="#9aa3b2" style={st.in} value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable style={st.btn} onPress={go}>
        <Text style={st.btnT}>{mode === "register" ? copy.register : copy.login}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === "register" ? "login" : "register")}>
        <Text style={st.link}>{mode === "register" ? copy.login : copy.register}</Text>
      </Pressable>
      <Text style={st.msg}>{msg}</Text>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#07080c", padding: 24 },
  h: { color: "#e8d48b", fontSize: 28, marginBottom: 16 },
  in: { borderWidth: 1, borderColor: "rgba(201,162,39,0.3)", color: "#f4f1ea", padding: 12, borderRadius: 10, marginBottom: 12 },
  btn: { backgroundColor: "#c9a227", padding: 14, borderRadius: 999, alignItems: "center" },
  btnT: { color: "#140f04", fontWeight: "600" },
  link: { color: "#c9a227", marginTop: 16 },
  msg: { color: "#9aa3b2", marginTop: 12 },
});
