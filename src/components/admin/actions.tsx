import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { performAdminOperation, retryAdminAudio } from "@/server-fns/admin-functions";
import { approveReleaseFn, requestChangesReleaseFn } from "@/server-fns/data-functions";
import type { AdminSnapshot } from "./model";
type Action =
  | "retry_audio"
  | "approve"
  | "request_changes"
  | "reschedule"
  | "takedown"
  | "reinstate"
  | "verify_artist"
  | "edit_artist"
  | "create_genre"
  | "edit_genre"
  | "delete_genre"
  | "staff_role"
  | "create_staff"
  | "edit_staff";
const labels: Record<Action, string> = {
  retry_audio: "Retry failed audio",
  approve: "Approve release",
  request_changes: "Request corrections",
  reschedule: "Reschedule release",
  takedown: "Take down release",
  reinstate: "Reinstate for review",
  verify_artist: "Set artist verification",
  edit_artist: "Edit artist metadata",
  create_genre: "Create genre",
  edit_genre: "Edit genre",
  delete_genre: "Delete unused genre",
  staff_role: "Assign or change role",
  create_staff: "Create staff account",
  edit_staff: "Edit staff account",
};
const pageActions: Record<string, Action[]> = {
  "Audio Processing": ["retry_audio"],
  "Review Queue": ["approve", "request_changes"],
  "Scheduled Releases": ["reschedule"],
  "Music Catalog": ["takedown", "reinstate"],
  "Artist Directory": ["verify_artist", "edit_artist"],
  "Genre Taxonomy": ["create_genre", "edit_genre", "delete_genre"],
  "Staff & Access": ["create_staff", "staff_role", "edit_staff"],
};
export function AdminActions({
  data,
  page,
  refresh,
}: {
  data: AdminSnapshot;
  page: string;
  refresh: () => Promise<void>;
}) {
  const [action, setAction] = useState<Action | null>(null),
    [targetId, setTargetId] = useState(""),
    [reason, setReason] = useState(""),
    [date, setDate] = useState(""),
    [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [image, setImage] = useState(""),
    [bio, setBio] = useState(""),
    [location, setLocation] = useState(""),
    [role, setRole] = useState("moderator"),
    [verified, setVerified] = useState(true),
    [password, setPassword] = useState(""),
    [email, setEmail] = useState(""),
    [username, setUsername] = useState(""),
    [initialPassword, setInitialPassword] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const allowed = pageActions[page] || [];
  if (
    !allowed.length ||
    (data.currentUser.role === "moderator" && page !== "Review Queue") ||
    (page === "Staff & Access" && data.currentUser.role !== "super_admin")
  )
    return null;
  const targets =
    action === "retry_audio"
      ? data.tracks
          .filter((t) => t.audioProcessingStatus === "failed")
          .map((t) => ({ id: t.id, label: t.title + " · " + t.artistName }))
      : ["staff_role", "edit_staff"].includes(action || "")
        ? data.users
            .filter(
              (u) =>
                u.id !== data.currentUser.id &&
                u.adminRole !== "super_admin" &&
                (action !== "edit_staff" || ["admin", "moderator"].includes(u.adminRole || "")),
            )
            .map((u) => ({
              id: u.id,
              label: `${u.name} · ${u.email} · ${u.adminActive ? u.adminRole : "ordinary user"}`,
            }))
        : action?.includes("artist")
          ? data.artists.map((a) => ({ id: a.id, label: a.displayName }))
          : action?.includes("genre")
            ? data.genres.map((g) => ({ id: g.id, label: g.name }))
            : data.releases
                .filter((r) =>
                  action === "reschedule"
                    ? r.status === "scheduled"
                    : action === "approve" || action === "request_changes"
                      ? r.status === "under_review"
                      : true,
                )
                .map((r) => ({ id: r.id, label: `${r.title} · ${r.artistName} · ${r.status}` }));
  const open = (a: Action) => {
    setAction(a);
    setTargetId("");
    setReason("");
    setDate("");
    setName("");
    setSlug("");
    setImage("");
    setBio("");
    setLocation("");
    setPassword("");
    setEmail("");
    setUsername("");
    setInitialPassword("");
    setRole("moderator");
    setConfirmed(false);
    setMessage("");
  };
  const selectTarget = (id: string) => {
    setTargetId(id);
    const user = data.users.find((u) => u.id === id);
    if (user) {
      setName(user.name);
      setUsername(user.username || "");
      setEmail(user.email);
    }
    const r = data.releases.find((x) => x.id === id);
    if (r) setDate(r.releaseDate);
    const g = data.genres.find((x) => x.id === id);
    if (g) {
      setName(g.name);
      setSlug(g.slug);
      setImage(g.image);
    }
    const a = data.artists.find((x) => x.id === id);
    if (a) {
      setName(a.displayName);
      setLocation(a.location);
      setVerified(a.verified);
    }
  };
  const submit = async () => {
    if (!action || !confirmed || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "retry_audio") {
        const result = await retryAdminAudio({ data: { trackId: targetId } });
        if (!result.success) throw new Error(result.error);
      } else if (action === "approve")
        await approveReleaseFn({ data: { releaseId: targetId, newReleaseDate: date } });
      else if (action === "request_changes")
        await requestChangesReleaseFn({ data: { releaseId: targetId, feedback: reason } });
      else {
        const fields: Record<string, unknown> = {
          action,
          targetId: ["create_genre", "create_staff"].includes(action) ? "new" : targetId,
          reason,
          confirmed: true,
        };
        if (action === "reschedule") fields["date"] = date;
        if (["staff_role", "create_staff", "edit_staff"].includes(action)) {
          if (action !== "edit_staff") fields["role"] = role;
          if (action !== "staff_role") {
            fields["name"] = name;
            fields["username"] = username;
            fields["email"] = email;
          }
          if (action === "create_staff") fields["initialPassword"] = initialPassword;
          fields["password"] = password;
        }
        if (action === "verify_artist") fields["verified"] = verified;
        if (action === "edit_artist") {
          fields["name"] = name;
          fields["location"] = location;
          if (bio) fields["bio"] = bio;
        }
        if (action === "create_genre" || action === "edit_genre") {
          fields["name"] = name;
          fields["slug"] = slug;
          fields["image"] = image;
        }
        await performAdminOperation({ data: fields });
      }
      setPassword("");
      setInitialPassword("");
      setAction(null);
      await refresh();
      setMessage("Change saved and recorded in the administrative audit log.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The operation failed. Refresh and retry.");
    } finally {
      setBusy(false);
      setPassword("");
      setInitialPassword("");
    }
  };
  return (
    <section className="ad-panel" style={{ padding: 16, marginBottom: 16 }}>
      <div className="ad-dialog-actions">
        {allowed.map((a) => (
          <button key={a} className="ad-btn" onClick={() => open(a)}>
            {labels[a]}
          </button>
        ))}
      </div>
      {!action && message && <p role="status">{message}</p>}
      <Dialog
        open={!!action}
        onOpenChange={(v) => {
          if (!busy && !v) {
            setAction(null);
            setPassword("");
            setInitialPassword("");
          }
        }}
      >
        <DialogContent overlayClassName="ad-dialog-overlay" className="ad-dialog">
          <DialogTitle>{action ? labels[action] : ""}</DialogTitle>
          <DialogDescription>
            Changes affect the existing Plugg database and are recorded with your account. Review
            the target carefully.
          </DialogDescription>
          <form
            className="ad-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {action !== "create_genre" && action !== "create_staff" && (
              <label>
                Target
                <select required value={targetId} onChange={(e) => selectTarget(e.target.value)}>
                  <option value="">Select an existing record</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(action === "approve" || action === "reschedule") && (
              <label>
                Future publication date (midnight Kampala)
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            )}
            {(action === "create_genre" || action === "edit_genre" || action === "edit_artist") && (
              <label>
                Name
                <input required value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}
            {(action === "create_genre" || action === "edit_genre") && (
              <>
                <label>
                  Slug
                  <input required value={slug} onChange={(e) => setSlug(e.target.value)} />
                </label>
                <label>
                  Artwork URL
                  <input value={image} onChange={(e) => setImage(e.target.value)} />
                </label>
              </>
            )}
            {action === "edit_artist" && (
              <>
                <label>
                  Location
                  <input value={location} onChange={(e) => setLocation(e.target.value)} />
                </label>
                <label>
                  New biography (blank leaves unchanged)
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                </label>
              </>
            )}
            {action === "verify_artist" && (
              <>
                <p>
                  This records a platform verification decision; it does not perform an identity
                  check.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                  />{" "}
                  Verified artist
                </label>
              </>
            )}
            {["staff_role", "create_staff", "edit_staff"].includes(action || "") && (
              <>
                {action !== "staff_role" && (
                  <>
                    <label>
                      Full name
                      <input required value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label>
                      Username
                      <input
                        required
                        pattern="[a-z0-9_-]{3,30}"
                        autoComplete="off"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                  </>
                )}
                {action === "create_staff" && (
                  <>
                    <label>
                      Initial password
                      <input
                        required
                        type="password"
                        minLength={12}
                        maxLength={72}
                        autoComplete="new-password"
                        value={initialPassword}
                        onChange={(e) => setInitialPassword(e.target.value)}
                      />
                    </label>
                    <p>
                      Use at least 12 characters. Share credentials privately with the staff member.
                      No email is sent; they can change the password after signing in.
                    </p>
                  </>
                )}
                {action !== "edit_staff" && (
                  <label>
                    Access
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      {action === "staff_role" && <option value="none">Revoke staff access</option>}
                    </select>
                  </label>
                )}
                <label>
                  Your current password
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </>
            )}
            {action !== "approve" && action !== "retry_audio" && (
              <label>
                {action === "request_changes" ? "Required artist feedback" : "Required reason"}
                <textarea required value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
            )}
            <label>
              <input
                required
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              I confirm this action on the selected record
              {["staff_role", "create_staff", "edit_staff"].includes(action || "")
                ? " and have verified the intended staff account"
                : ""}
              .
            </label>
            {message && <p role="alert">{message}</p>}
            <button className="ad-btn ad-btn-primary" disabled={busy || !confirmed} type="submit">
              {busy ? "Saving…" : "Confirm and save"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
