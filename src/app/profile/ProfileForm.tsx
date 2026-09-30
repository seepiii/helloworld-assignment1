"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { buttonClass, inputClass } from "@/components/Panel";

const MAX_BYTES = 5 * 1024 * 1024;

export default function ProfileForm({
  userId,
  firstName,
  lastName,
  avatarUrl,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setMessage({ ok: false, text: "Please choose an image file." });
      return;
    }
    if (picked.size > MAX_BYTES) {
      setMessage({ ok: false, text: "Images must be 5 MB or smaller." });
      return;
    }
    setMessage(null);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function save(formData: FormData) {
    setSaving(true);
    setMessage(null);
    const supabase = createSupabaseBrowser();

    const first = String(formData.get("first_name") ?? "").trim();
    const last = String(formData.get("last_name") ?? "").trim();
    const updates: Record<string, string | null> = {
      first_name: first || null,
      last_name: last || null,
      updated_at: new Date().toISOString(),
    };

    // The image goes to Storage; only its URL is stored in the table.
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        setSaving(false);
        setMessage({ ok: false, text: `Upload failed: ${uploadError.message}` });
        return;
      }
      updates.avatar_url = supabase.storage
        .from("avatars")
        .getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: error.message });
      return;
    }
    setFile(null);
    setMessage({ ok: true, text: "Profile saved." });
    router.refresh();
  }

  return (
    <form action={save} className="flex w-full flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group relative h-28 w-28 overflow-hidden rounded-full border border-[#e9c46a]/40 bg-black/40"
        aria-label="Change photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs tracking-[0.15em] text-white/40 uppercase">
            add photo
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs tracking-[0.15em] text-white uppercase opacity-0 transition group-hover:opacity-100">
          change
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={pickFile}
        className="hidden"
      />

      <input
        name="first_name"
        placeholder="First name"
        defaultValue={firstName}
        className={inputClass}
      />
      <input
        name="last_name"
        placeholder="Last name"
        defaultValue={lastName}
        className={inputClass}
      />

      {message && (
        <p
          className={`text-sm ${message.ok ? "text-[#f4dfa6]" : "text-red-300"}`}
        >
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving} className={buttonClass}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
