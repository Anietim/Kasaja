import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, MessageSquare, Store, Bike, ShoppingBag, Loader2, Lock, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserTicks } from '@/components/Tick'
import { getOrCreateConversation } from '@/lib/chat'

interface ProfileRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
  is_private: boolean
  can_see_details: boolean
  bio: string | null
  roles: string[] | null
  state: string | null
  city: string | null
  location: string | null
  followers: number
  following: number
  follow_status: 'pending' | 'accepted' | null
}

interface FollowRequest {
  follower_id: string
  follower: { display_name: string | null; avatar_url: string | null } | null
}

const ROLE_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  buyer:  { label: 'Buyer',  icon: <ShoppingBag size={12} /> },
  seller: { label: 'Seller', icon: <Store size={12} /> },
  rider:  { label: 'Rider',  icon: <Bike size={12} /> },
}

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const isMe = !!user && user.id === id

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.rpc('get_public_profile', { p_id: id })
    const row = (Array.isArray(data) ? data[0] : data) as ProfileRow | undefined
    setProfile(row ?? null)

    if (row?.can_see_details) {
      const { data: stores } = await supabase.from('stores').select('id').eq('owner_id', id).limit(1)
      setStoreId(stores && stores.length > 0 ? (stores[0].id as string) : null)
    } else {
      setStoreId(null)
    }

    if (user && user.id === id) {
      const { data: reqs } = await supabase
        .from('follows')
        .select('follower_id, follower:profiles!follower_id(display_name, avatar_url)')
        .eq('following_id', id)
        .eq('status', 'pending')
      setRequests((reqs ?? []) as unknown as FollowRequest[])
    }
    setLoading(false)
  }, [id, user])

  useEffect(() => { void load() }, [load])

  async function toggleFollow() {
    if (!user || !id || !profile) return
    setBusy(true)
    if (profile.follow_status) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id)
      if (error) toast.error(error.message)
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: id })
      if (error) toast.error(error.message)
    }
    await load()
    setBusy(false)
  }

  async function answerRequest(followerId: string, accept: boolean) {
    if (!user) return
    const q = accept
      ? supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('following_id', user.id)
      : supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', user.id)
    const { error } = await q
    if (error) { toast.error(error.message); return }
    await load()
  }

  async function togglePrivate() {
    if (!user || !profile) return
    const next = !profile.is_private
    const { error } = await supabase.from('profiles').update({ is_private: next }).eq('id', user.id)
    if (error) { toast.error(error.message); return }
    toast.success(next ? 'Your profile is now private' : 'Your profile is now public')
    await load()
  }

  async function openChat() {
    if (!id) return
    setBusy(true)
    const cid = await getOrCreateConversation(id)
    setBusy(false)
    if (cid) void navigate(`/inbox/${cid}`)
    else toast.error('Could not open chat')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-neutral-400">This profile could not be found.</p>
        <button onClick={() => void navigate(-1)} className="text-brand-400">Go back</button>
      </div>
    )
  }

  const name = profile.display_name?.trim() || 'KASAJA user'
  const place = [profile.city, profile.state].filter(Boolean).join(', ') || profile.location
  const followLabel = profile.follow_status === 'accepted' ? 'Following'
    : profile.follow_status === 'pending' ? 'Requested'
    : profile.is_private ? 'Request to follow' : 'Follow'

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-white font-display">Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-surface-800 overflow-hidden flex items-center justify-center">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-3xl font-bold text-white">{name[0]?.toUpperCase()}</span>}
        </div>
        <h2 className="mt-4 text-xl font-bold text-white flex items-center gap-1.5">
          {name}
          <UserTicks userId={id} size={20} legacyVerified={!!profile.is_verified} />
        </h2>

        <div className="flex gap-6 mt-3 text-sm">
          <span className="text-white"><b>{profile.followers}</b> <span className="text-neutral-400">followers</span></span>
          <span className="text-white"><b>{profile.following}</b> <span className="text-neutral-400">following</span></span>
        </div>

        {profile.can_see_details && (
          <>
            <div className="flex gap-2 mt-3 flex-wrap justify-center">
              {(profile.roles ?? []).filter(r => ROLE_LABEL[r]).map(r => (
                <span key={r} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-400">
                  {ROLE_LABEL[r].icon} {ROLE_LABEL[r].label}
                </span>
              ))}
            </div>
            {place && (
              <p className="mt-3 text-sm text-neutral-400 flex items-center gap-1"><MapPin size={14} /> {place}</p>
            )}
            {profile.bio && <p className="mt-4 text-sm text-neutral-300 leading-relaxed">{profile.bio}</p>}
          </>
        )}

        {!profile.can_see_details && (
          <div className="mt-6 w-full bg-surface-900 rounded-2xl p-5 flex flex-col items-center gap-2">
            <Lock className="text-neutral-500" size={20} />
            <p className="text-white text-sm font-semibold">This profile is private</p>
            <p className="text-neutral-400 text-xs">Follow this account to see their details.</p>
          </div>
        )}

        <div className="w-full mt-6 space-y-3">
          {!isMe && (
            <button
              onClick={() => void toggleFollow()}
              disabled={busy}
              className={`w-full font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 ${
                profile.follow_status ? 'bg-surface-800 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : followLabel}
            </button>
          )}
          {storeId && (
            <button
              onClick={() => void navigate(`/store/${storeId}`)}
              className="w-full bg-surface-800 hover:bg-surface-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              <Store size={16} /> View store
            </button>
          )}
          {!isMe && (
            <button
              onClick={() => void openChat()}
              disabled={busy}
              className="w-full bg-surface-800 hover:bg-surface-700 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <MessageSquare size={16} /> Message
            </button>
          )}
        </div>

        {isMe && (
          <div className="w-full mt-2 space-y-4 text-left">
            <button
              onClick={() => void navigate('/profile')}
              className="w-full bg-surface-800 text-white font-semibold py-3.5 rounded-xl"
            >
              Edit my profile
            </button>

            <div className="bg-surface-900 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-sm font-semibold">Private profile</p>
                <p className="text-neutral-400 text-xs">Only people you approve can see your details.</p>
              </div>
              <button
                onClick={() => void togglePrivate()}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${profile.is_private ? 'bg-brand-500' : 'bg-surface-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profile.is_private ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {requests.length > 0 && (
              <div className="bg-surface-900 rounded-2xl divide-y divide-surface-800 overflow-hidden">
                <p className="px-4 py-3 text-white text-sm font-semibold">Follow requests ({requests.length})</p>
                {requests.map(r => (
                  <div key={r.follower_id} className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => void navigate(`/profile/${r.follower_id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className="w-10 h-10 rounded-full bg-surface-800 overflow-hidden flex items-center justify-center shrink-0">
                        {r.follower?.avatar_url
                          ? <img src={r.follower.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-white font-bold">{(r.follower?.display_name ?? '?')[0]?.toUpperCase()}</span>}
                      </div>
                      <span className="text-white text-sm truncate">{r.follower?.display_name || 'KASAJA user'}</span>
                    </button>
                    <button onClick={() => void answerRequest(r.follower_id, true)} className="p-2 rounded-full bg-brand-500 text-white"><Check size={16} /></button>
                    <button onClick={() => void answerRequest(r.follower_id, false)} className="p-2 rounded-full bg-surface-800 text-neutral-300"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}