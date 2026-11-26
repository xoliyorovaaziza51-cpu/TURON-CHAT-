import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Phone,
  Send,
  UserPlus,
  Video,
  X,
  MessageSquare,
} from 'lucide-react';
import { apiFetch, formatUzTime } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import { VoiceMessagePlayer, VoiceRecorderButton } from './VoiceMessageControl';
import type {
  ConversationSummary,
  PrivateMessage,
  ServiceConfigStatus,
  UserProfile,
} from '../types/turon';

interface MessagesViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  serviceStatus: ServiceConfigStatus;
  initialPartnerId?: string | null;
  incomingDm: PrivateMessage | null;
  onOpenUserProfile: (u: UserProfile) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  allUsers,
  serviceStatus,
  initialPartnerId,
  incomingDm,
  onOpenUserProfile,
}) => {
  const [tab, setTab] = useState<'chats' | 'friends'>('chats');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<Array<{ requestId: string; user: UserProfile }>>([]);
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [thread, setThread] = useState<PrivateMessage[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{
    url: string;
    type: 'image' | 'file';
    name: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [callNotice, setCallNotice] = useState<'voice' | 'video' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Nomaqbul xabarlar');
  const [reportDetails, setReportDetails] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadConversations() {
    try {
      const res = await apiFetch<{ conversations: ConversationSummary[] }>(
        '/api/messages/conversations'
      );
      setConversations(res.conversations);
    } catch {
      // ignore
    }
  }

  async function loadFriends() {
    try {
      const res = await apiFetch<{
        friends: UserProfile[];
        incomingRequests: Array<{ requestId: string; user: UserProfile }>;
      }>('/api/friends');
      setFriends(res.friends);
      setIncomingReqs(res.incomingRequests);
    } catch {
      // ignore
    }
  }

  async function openThread(partner: UserProfile) {
    setActivePartner(partner);
    setError('');
    try {
      const res = await apiFetch<{ messages: PrivateMessage[] }>(`/api/messages/${partner.id}`);
      setThread(res.messages);
      loadConversations();
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadConversations();
    loadFriends();
  }, []);

  useEffect(() => {
    if (initialPartnerId) {
      const found = allUsers.find((u) => u.id === initialPartnerId);
      if (found) {
        setTab('chats');
        openThread(found);
      }
    }
  }, [initialPartnerId]);

  useEffect(() => {
    if (!incomingDm) return;
    loadConversations();
    if (
      activePartner &&
      (incomingDm.senderId === activePartner.id || incomingDm.receiverId === activePartner.id)
    ) {
      setThread((prev) =>
        prev.some((m) => m.id === incomingDm.id) ? prev : [...prev, incomingDm]
      );
    }
  }, [incomingDm]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Fayl hajmi 2 MB dan oshmasligi kerak');
      return;
    }
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        url: String(reader.result || ''),
        type: isImage ? 'image' : 'file',
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activePartner || (!text.trim() && !attachment)) return;
    setError('');
    try {
      const res = await apiFetch<{ message: PrivateMessage }>(
        `/api/messages/${activePartner.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: text.trim(),
            attachmentUrl: attachment?.url || null,
            attachmentType: attachment?.type || null,
            attachmentName: attachment?.name || null,
          }),
        }
      );
      setThread((prev) => [...prev, res.message]);
      setText('');
      setAttachment(null);
      loadConversations();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSendVoice(payload: { audioUrl: string; durationSec: number }) {
    if (!activePartner) return;
    setError('');
    const res = await apiFetch<{ message: PrivateMessage }>(
      `/api/messages/${activePartner.id}`,
      {
        method: 'POST',
        body: JSON.stringify({
          content: '',
          attachmentUrl: payload.audioUrl,
          attachmentType: 'voice',
          attachmentName: 'Ovozli xabar',
          audioDurationSec: payload.durationSec,
        }),
      }
    );
    setThread((prev) => [...prev, res.message]);
    loadConversations();
  }

  async function handleRespondFriend(requestId: string, accept: boolean) {
    try {
      await apiFetch(`/api/friends/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      loadFriends();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleBlock() {
    if (!activePartner) return;
    try {
      const res = await apiFetch<{ blocked: boolean }>(`/api/users/${activePartner.id}/block`, {
        method: 'POST',
      });
      setActivePartner({ ...activePartner, isBlocked: res.blocked });
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!activePartner) return;
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'user',
          targetId: activePartner.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setShowReportModal(false);
      setReportDetails('');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-10rem)] pb-20 lg:pb-6">
      {/* Left Sidebar: Chats & Friends */}
      <div
        className={`lg:col-span-4 bg-[#0F1524] border border-white/[0.07] rounded-2xl flex flex-col overflow-hidden ${
          activePartner ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="p-3 border-b border-white/[0.07]">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#080B14] rounded-xl">
            <button
              type="button"
              onClick={() => setTab('chats')}
              className={`min-h-[40px] rounded-lg text-xs font-medium transition-colors ${
                tab === 'chats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Suhbatlar
            </button>
            <button
              type="button"
              onClick={() => setTab('friends')}
              className={`min-h-[40px] rounded-lg text-xs font-medium transition-colors ${
                tab === 'friends' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Do‘stlar ({friends.length + incomingReqs.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tab === 'chats' ? (
            <>
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Hozircha shaxsiy suhbatlar yo‘q. Do‘stlar bo‘limidan suhbat boshlang.
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.partner.id}
                    type="button"
                    onClick={() => openThread(c.partner)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-colors ${
                      activePartner?.id === c.partner.id
                        ? 'bg-blue-600/15 border border-blue-500/40'
                        : 'bg-[#080B14] border border-white/[0.05] hover:border-white/15'
                    }`}
                  >
                    <AvatarWithFrame
                      src={c.partner.avatarUrl}
                      alt={c.partner.nickname}
                      size="sm"
                      frameStyle={c.partner.frameStyle}
                      vipLevel={c.partner.vipLevel}
                      svipLevel={c.partner.svipLevel}
                      onlineStatus={c.partner.onlineStatus}
                      showOnline
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {c.partner.nickname}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="text-[11px] font-mono font-semibold text-blue-400">
                            {c.unreadCount} yangi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {c.lastMessage?.attachmentType === 'voice'
                          ? '🎤 Ovozli xabar'
                          : c.lastMessage?.content || c.lastMessage?.attachmentName || 'Yozishma'}
                      </p>
                    </div>
                  </button>
                ))
              )}

              <div className="pt-3 border-t border-white/[0.06]">
                <div className="text-xs text-slate-400 mb-2 px-1">Yangi suhbat boshlash</div>
                <div className="space-y-1.5">
                  {allUsers
                    .filter(
                      (u) =>
                        u.id !== currentUser.id &&
                        !conversations.some((c) => c.partner.id === u.id)
                    )
                    .slice(0, 5)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => openThread(u)}
                        className="w-full p-2.5 rounded-xl hover:bg-white/[0.04] flex items-center gap-2.5 text-left"
                      >
                        <AvatarWithFrame src={u.avatarUrl} alt={u.nickname} size="xs" onlineStatus={u.onlineStatus} showOnline />
                        <span className="text-xs text-slate-200 truncate flex-1">{u.nickname}</span>
                        <span className="text-xs text-blue-400">Yozish</span>
                      </button>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {incomingReqs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#E5B84B] px-1">
                    Kiruvchi do‘stlik so‘rovlari
                  </div>
                  {incomingReqs.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 rounded-xl bg-[#080B14] border border-[#E5B84B]/30 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarWithFrame src={req.user.avatarUrl} alt={req.user.nickname} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {req.user.nickname}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{req.user.publicId}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRespondFriend(req.requestId, true)}
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-blue-600 text-white flex items-center justify-center"
                          aria-label="Qabul qilish"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondFriend(req.requestId, false)}
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-white/10 text-slate-300 flex items-center justify-center"
                          aria-label="Rad etish"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 px-1">Do‘stlar ro‘yxati</div>
                {friends.length === 0 ? (
                  <p className="text-xs text-slate-500 px-1">Hozircha tasdiqlangan do‘stlar yo‘q.</p>
                ) : (
                  friends.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-xl bg-[#080B14] border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenUserProfile(f)}
                        className="flex items-center gap-2.5 min-w-0 text-left"
                      >
                        <AvatarWithFrame
                          src={f.avatarUrl}
                          alt={f.nickname}
                          size="sm"
                          onlineStatus={f.onlineStatus}
                          showOnline
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{f.nickname}</div>
                          <div className="text-xs text-slate-400">
                            {f.onlineStatus === 'offline' ? 'Oflayn' : 'Onlayn'}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('chats');
                          openThread(f);
                        }}
                        className="min-h-[36px] px-3 rounded-lg bg-blue-600/20 text-blue-300 text-xs font-medium"
                      >
                        Xabar
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <div className="text-xs font-medium text-slate-400 px-1">Boshqa foydalanuvchilar</div>
                {allUsers
                  .filter(
                    (u) =>
                      u.id !== currentUser.id && !friends.some((f) => f.id === u.id)
                  )
                  .slice(0, 5)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-xl bg-[#080B14] border border-white/[0.05] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarWithFrame src={u.avatarUrl} alt={u.nickname} size="xs" />
                        <span className="text-xs text-white truncate">{u.nickname}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/users/${u.id}/friend-request`, { method: 'POST' });
                          loadFriends();
                        }}
                        className="min-h-[34px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-200 flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Qo‘shish</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Thread */}
      <div
        className={`lg:col-span-8 bg-[#0F1524] border border-white/[0.07] rounded-2xl flex flex-col overflow-hidden ${
          activePartner ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {activePartner ? (
          <>
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActivePartner(null)}
                  className="lg:hidden min-h-[40px] px-2.5 rounded-lg bg-white/5 text-xs text-slate-300"
                >
                  Orqaga
                </button>
                <button
                  type="button"
                  onClick={() => onOpenUserProfile(activePartner)}
                  className="flex items-center gap-2.5 min-w-0 text-left"
                >
                  <AvatarWithFrame
                    src={activePartner.avatarUrl}
                    alt={activePartner.nickname}
                    size="sm"
                    frameStyle={activePartner.frameStyle}
                    vipLevel={activePartner.vipLevel}
                    svipLevel={activePartner.svipLevel}
                    onlineStatus={activePartner.onlineStatus}
                    showOnline
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {activePartner.nickname}
                    </div>
                    <div className="text-xs text-slate-400">
                      {activePartner.onlineStatus === 'offline' ? 'Oflayn' : 'Onlayn'} ·{' '}
                      <span className="font-mono">{activePartner.publicId}</span>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCallNotice('voice')}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
                  title="Ovozli qo‘ng‘iroq"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCallNotice('video')}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
                  title="Video qo‘ng‘iroq"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center ${
                    activePartner.isBlocked
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                  title={activePartner.isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
                >
                  <Ban className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 flex items-center justify-center"
                  title="Shikoyat qilish"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {callNotice && (
              <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-200">
                <span>
                  {serviceStatus.livekitConfigured
                    ? `${callNotice === 'voice' ? 'Ovozli' : 'Video'} qo‘ng‘iroq uchun LiveKit xonasi tayyor.`
                    : `Shaxsiy ${callNotice === 'voice' ? 'ovozli' : 'video'} qo‘ng‘iroqlar LiveKit aloqa provayderi sozlangandan so‘ng ishlaydi (LIVEKIT_URL / API kalitlari kiritilmagan).`}
                </span>
                <button
                  type="button"
                  onClick={() => setCallNotice(null)}
                  className="text-amber-300 underline shrink-0"
                >
                  Yopish
                </button>
              </div>
            )}

            {error && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080B14]/40">
              {thread.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Birinchi xabarni yuboring
                </div>
              ) : (
                thread.map((m) => {
                  const mine = m.senderId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#151D31] text-slate-100 border border-white/[0.06]'
                        }`}
                      >
                        {m.attachmentUrl && m.attachmentType === 'image' && (
                          <img
                            src={m.attachmentUrl}
                            alt={m.attachmentName || 'Rasm'}
                            className="rounded-xl max-h-52 object-cover mb-2"
                          />
                        )}
                        {m.attachmentUrl && m.attachmentType === 'voice' && (
                          <div className="mb-1">
                            <VoiceMessagePlayer
                              audioUrl={m.attachmentUrl}
                              durationSec={m.audioDurationSec || 1}
                              tone={mine ? 'blue' : 'dark'}
                            />
                          </div>
                        )}
                        {m.attachmentUrl && m.attachmentType === 'file' && (
                          <a
                            href={m.attachmentUrl}
                            download={m.attachmentName || 'fayl'}
                            className="flex items-center gap-2 p-2 rounded-lg bg-black/25 text-xs underline mb-1.5"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">{m.attachmentName || 'Fayl'}</span>
                          </a>
                        )}
                        {m.content && <p className="break-words">{m.content}</p>}
                        <div
                          className={`text-[10px] font-mono mt-1 text-right ${
                            mine ? 'text-blue-100/75' : 'text-slate-400'
                          }`}
                        >
                          {formatUzTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="p-3 border-t border-white/[0.07] bg-[#0F1524] space-y-2"
            >
              {attachment && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#080B14] border border-white/10 text-xs text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    {attachment.type === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-purple-400" />
                    )}
                    <span className="truncate">{attachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.doc,.docx"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[#080B14] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center"
                  title="Rasm yoki fayl biriktirish"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Xabar yozing..."
                  className="flex-1 min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <VoiceRecorderButton
                  onRecorded={handleSendVoice}
                  onError={(msg) => setError(msg)}
                />
                <button
                  type="submit"
                  disabled={!text.trim() && !attachment}
                  className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="w-10 h-10 text-slate-600 mb-3" />
            <h4 className="font-display text-base font-semibold text-white">Shaxsiy xabarlar</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Chap ro‘yxatdan suhbatdosh tanlang yoki do‘stlaringizga xabar yozing.
            </p>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && activePartner && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">
                Shikoyat yuborish · {activePartner.nickname}
              </h4>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-3">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              >
                <option value="Nomaqbul xabarlar">Nomaqbul xabarlar</option>
                <option value="Spam yoki firibgarlik">Spam yoki firibgarlik</option>
                <option value="Haqorat va tahqirlash">Haqorat va tahqirlash</option>
              </select>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Batafsil izoh yozing..."
                className="w-full p-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-amber-600 text-white font-semibold text-sm"
              >
                Shikoyatni yuborish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
