import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Tag, MessageCircle, ChevronDown, ChevronUp,
  Lock, Share2, Users, MapPin, Hash, ImagePlus, X, UserPlus, UserCheck, Eye
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { sendGroupNotification } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { isStaff } from '@/lib/staff'
import { UserTicks } from '@/components/Tick'
import { toast } from 'sonner'

const DEV = import.meta.env.DEV
const DEV_UID = 'dev-super-admin-id'
const DEV_NAME = 'Dev Admin'

// Messaging rules
function canDM(myRoles: string[], theirRoles: string[]): boolean {
  if (myRoles.includes('super_admin') || myRoles.includes('admin')) return true
  // Buyer can message seller and rider
  if (myRoles.includes('buyer') && (theirRoles.includes('seller') || theirRoles.includes('rider'))) return true
  // Seller can message buyer
  if (myRoles.includes('seller') && theirRoles.includes('buyer')) return true
  return false
}

interface Post {
  id: string
  content: string
  post_type: 'want' | 'offer'
  author_id: string
  created_at: string
  author_name: string
  author_roles: string[]
  hashtags: string[]
  images: string[]
  replies: Reply[]
}

interface Reply {
  id: string
  content: string
  price: number | null
  author_id: string
  created_at: string
  author_name: string
  author_roles: string[]
}

interface Group {
  id: string
  name: string
  description: string
  market_name: string
  member_count: number
  free_until: string | null
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function extractHashtags(text: string): string[] {
  return (text.match(/#[\w]+/g) ?? []).map(t => t.toLowerCase())
}

// Mini user profile sheet shown on name tap
function UserProfileSheet({
  userId, name, roles, onClose, onDM, onFollow, isFollowing
}: {
  userId: string; name: string; roles: string[]
  onClose: () => void; onDM: () => void; onFollow: () => void; isFollowing: boolean
}) {
  const navigate = useNavigate()
  const roleLabel = roles.includes('seller') ? '🏪 Seller' : roles.includes('rider') ? '🏍️ Rider' : '🛒 Buyer'
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-zinc-900 rounded-t-3xl p-5 border-t border-zinc-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center text-black font-black text-xl">
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white text-base flex items-center gap-1.5">{name}<UserTicks userId={userId} size={16} /></p>
            <p className="text-xs text-zinc-400">{roleLabel}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { onClose(); void navigate(`/store/${userId}`) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-800 rounded-xl text-xs font-bold text-zinc-300"
          >
            <Eye size={14} /> View Profile
          </button>
          <button
            onClick={onFollow}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold
              ${isFollowing ? 'bg-zinc-700 text-zinc-300' : 'bg-brand-500 text-black'}`}
          >
            {isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
          </button>
          <button
            onClick={onDM}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-500 rounded-xl text-xs font-bold text-black"
          >
            <MessageCircle size={14} /> Message
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GroupFeed() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [postType, setPostType] = useState<'want' | 'offer'>('want')
  const [content, setContent] = useState('')
  const [postImages, setPostImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyPrice, setReplyPrice] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [typingUsers, setTypingUsers] = useState<{ userId: string; displayName: string }[]>([])
  const [follows, setFollows] = useState<Set<string>>(new Set())
  const [profileSheet, setProfileSheet] = useState<{ userId: string; name: string; roles: string[] } | null>(null)
  const myRoles: string[] = DEV ? ['buyer', 'seller', 'rider', 'admin', 'super_admin'] : (profile?.roles ?? ['buyer'])
  const staff = !DEV && isStaff(myRoles)

  const uid = DEV ? DEV_UID : (user?.id ?? null)
  const uname = DEV ? DEV_NAME : (profile?.display_name ?? 'User')

  const { handleTyping } = useTypingIndicator({
    channelName: `group-typing-${id ?? ''}`,
    userId: uid ?? 'anon',
    displayName: uname,
    onTypingChange: setTypingUsers,
  })

  const loadGroup = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('market_groups')
      .select('*, market:ng_markets!market_id(name)')
      .eq('id', id)
      .single()
    if (data) {
      const m = data.market as unknown as { name: string } | null
      setGroup({
        id: data.id as string,
        name: data.name as string,
        description: data.description as string,
        market_name: m?.name ?? '',
        member_count: (data.member_count as number) ?? 0,
        free_until: (data.free_until as string | null) ?? null,
      })
    }
  }, [id])

  const loadPosts = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('group_posts')
      .select('id, content, post_type, author_id, created_at, images, hashtags, author:profiles!author_id(display_name, roles)')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const postList = (data as unknown as {
        id: string; content: string; post_type: string;
        author_id: string; created_at: string; images: string[] | null;
        hashtags: string[] | null;
        author: { display_name: string; roles: string[] } | null
      }[]).map(p => ({
        id: p.id,
        content: p.content,
        post_type: (p.post_type as 'want' | 'offer'),
        author_id: p.author_id,
        created_at: p.created_at,
        author_name: p.author?.display_name ?? 'Anonymous',
        author_roles: p.author?.roles ?? ['buyer'],
        hashtags: p.hashtags ?? extractHashtags(p.content),
        images: p.images ?? [],
        replies: [] as Reply[],
      }))

      const ids = postList.map(p => p.id)
      if (ids.length > 0) {
        const { data: rData } = await supabase
          .from('group_post_replies')
          .select('id, post_id, content, price, author_id, created_at, author:profiles!author_id(display_name, roles)')
          .in('post_id', ids)
          .order('created_at', { ascending: true })
        if (rData) {
          const replies = rData as unknown as {
            id: string; post_id: string; content: string;
            price: number | null; author_id: string; created_at: string;
            author: { display_name: string; roles: string[] } | null
          }[]
          replies.forEach(r => {
            const post = postList.find(p => p.id === r.post_id)
            if (post) {
              post.replies.push({
                id: r.id,
                content: r.content,
                price: r.price,
                author_id: r.author_id,
                created_at: r.created_at,
                author_name: r.author?.display_name ?? 'Seller',
                author_roles: r.author?.roles ?? ['seller'],
              })
            }
          })
        }
      }
      setPosts(postList)
    }
    setLoading(false)
  }, [id])

  // Load who I follow
  const loadFollows = useCallback(async () => {
    if (!uid || DEV) return
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', uid)
    if (data) setFollows(new Set((data as { following_id: string }[]).map(f => f.following_id)))
  }, [uid])

  useEffect(() => {
    void loadGroup()
    void loadPosts()
    void loadFollows()

    if (id) {
      const ch = supabase.channel(`group-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_posts', filter: `group_id=eq.${id}` },
          () => { void loadPosts() })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_post_replies' },
          () => { void loadPosts() })
        .subscribe()
      channelRef.current = ch
    }
    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current)
    }
  }, [id, loadGroup, loadPosts, loadFollows])

  const handleImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (postImages.length + files.length > 3) { toast.error('Maximum 3 images per post'); return }
    setUploading(true)
    const urls: string[] = []
    for (const file of files) {
      const path = `group-posts/${uid ?? 'dev'}-${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('kasaja-media').upload(path, file, { upsert: true })
      if (error) { toast.error(`Upload failed: ${file.name}`); continue }
      const { data: pub } = supabase.storage.from('kasaja-media').getPublicUrl(path)
      urls.push(pub.publicUrl)
    }
    setPostImages(prev => [...prev, ...urls])
    setUploading(false)
    if (e.target) e.target.value = ''
  }

  const submitPost = async () => {
    if (!content.trim() && postImages.length === 0) return
    if (!uid) { toast.error('Please log in to post'); return }
    const tags = extractHashtags(content)
    const { error } = await supabase.from('group_posts').insert({
      group_id: id,
      author_id: uid,
      content: content.trim(),
      post_type: postType,
      images: postImages,
      hashtags: tags,
    })
    if (error) { toast.error(error.message.includes('Join') || error.message.includes('Staff') ? error.message : 'Failed to post'); return }
    // If post has images, show how many subscribers will be notified
    if (postImages.length > 0 && !DEV) {
      const { count } = await supabase
        .from('group_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', id)
        .eq('status', 'active')
        .neq('user_id', uid)
      toast.success(`Posted! ${count ?? 0} subscribers will be notified.`)
    } else {
      toast.success(postImages.length > 0 ? 'Posted! Subscribers will be notified.' : 'Posted!')
    }
    setContent('')
    setPostImages([])
    setShowComposer(false)
    void loadPosts()
  }

  const submitReply = async (postId: string) => {
    if (!replyContent.trim()) return
    if (!uid) { toast.error('Please log in'); return }
    const { error } = await supabase.from('group_post_replies').insert({
      post_id: postId,
      author_id: uid,
      content: replyContent.trim(),
      price: replyPrice ? Number(replyPrice) : null,
    })
    if (error) { toast.error(error.message.includes('Join') || error.message.includes('Staff') ? error.message : 'Failed to reply'); return }
    toast.success('Reply sent!')
    // Notify post author
    const post = posts.find(p => p.id === postId)
    if (post && post.author_id !== uid) {
      const myPost = posts.find(p => p.author_id === uid)
      const senderName = myPost?.author_name ?? 'Someone'
      const replyText = replyPrice ? `₦${Number(replyPrice).toLocaleString()} — ${replyContent.trim()}` : replyContent.trim()
      void sendGroupNotification({
        recipientId: post.author_id,
        senderName,
        groupId: id ?? '',
        groupName: group?.name ?? 'Market Group',
        replyText,
        type: 'reply',
      })
    }
    setReplyContent('')
    setReplyPrice('')
    setReplyingTo(null)
    void loadPosts()
  }

  const startDM = async (otherUserId: string, theirRoles: string[]) => {
    if (!uid) { toast.error('Please log in'); return }
    if (!canDM(myRoles, theirRoles)) {
      toast.error('Only buyers can initiate direct messages to sellers and riders.')
      return
    }
    const sortedA = uid < otherUserId ? uid : otherUserId
    const sortedB = uid < otherUserId ? otherUserId : uid
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('participant_a', sortedA).eq('participant_b', sortedB).maybeSingle()
    let convId = (existing)?.id
    if (!convId) {
      const { data: newConv } = await supabase
        .from('conversations').insert({ participant_a: sortedA, participant_b: sortedB })
        .select('id').single()
      convId = (newConv)?.id
    }
    if (convId) void navigate(`/inbox/${convId}`)
  }

  const toggleFollow = async (targetId: string) => {
    if (!uid) { toast.error('Log in to follow'); return }
    if (follows.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', targetId)
      setFollows(prev => { const s = new Set(prev); s.delete(targetId); return s })
      toast.success('Unfollowed')
    } else {
      await supabase.from('follows').insert({ follower_id: uid, following_id: targetId })
      setFollows(prev => new Set(prev).add(targetId))
      toast.success('Following!')
    }
  }

  const shareGroup = () => {
    const url = `${window.location.origin}/groups/${id ?? ''}`
    if (navigator.share) {
      void navigator.share({ title: group?.name ?? 'Kasaja Market Group', text: `Join ${group?.name ?? 'this market group'} on Kasaja`, url })
    } else {
      void navigator.clipboard.writeText(url)
      toast.success('Group link copied!')
    }
  }

  const shortId = (id ?? '').slice(0, 8).toUpperCase()

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-zinc-400 text-sm">Loading group...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas pb-32">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 truncate">{group?.market_name}</p>
        </div>
        <button onClick={shareGroup} className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
          <Share2 size={16} className="text-zinc-300" />
        </button>
        {!staff && (
          <button onClick={() => setShowComposer(true)} className="bg-brand-500 text-black text-xs font-bold px-3 py-2 rounded-xl">
            + Post
          </button>
        )}
      </div>

      {/* Group profile header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-black font-black text-2xl flex-shrink-0">
            {(group?.name ?? 'G').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="font-black text-white text-lg leading-tight">{group?.name ?? 'Market Group'}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Hash size={11} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 font-mono tracking-widest">{shortId}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Users size={13} className="text-brand-500" />
            <span className="font-semibold text-white">{(group?.member_count ?? 0).toLocaleString()}</span>
            <span>members</span>
          </div>
          {group?.market_name && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <MapPin size={13} className="text-brand-500" />
              <span>{group.market_name}</span>
            </div>
          )}
        </div>
        {group?.free_until && new Date(group.free_until).getTime() > Date.now() && (
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--k-accent)' }}>
            {new Date(group.free_until).getFullYear() >= 2090 ? 'Free for now' : `Free until ${new Date(group.free_until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
        )}
        {group?.description && <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{group.description}</p>}
        <button onClick={shareGroup} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors">
          <Share2 size={14} /> Share this group
        </button>
      </div>

      {/* Typing indicator for group */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900/50 flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-zinc-500">
            {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Composer */}
      {showComposer && (
        <div className="mx-4 mt-3 bg-zinc-900 rounded-xl p-4 border border-zinc-700">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setPostType('want')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${postType === 'want' ? 'bg-brand-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
              I Want to Buy
            </button>
            <button onClick={() => setPostType('offer')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${postType === 'offer' ? 'bg-brand-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
              I Have for Sale
            </button>
          </div>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); handleTyping() }}
            placeholder={postType === 'want'
              ? 'What are you looking for? Use #hashtags e.g. #fabric #ankara'
              : 'What are you selling? Use #hashtags e.g. #phones #laptops'}
            className="w-full bg-zinc-800 text-white text-sm rounded-lg p-3 resize-none outline-none border border-transparent focus:border-brand-500 h-24"
          />
          {/* Hashtag preview */}
          {extractHashtags(content).length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {extractHashtags(content).map(tag => (
                <span key={tag} className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
          {postImages.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {postImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <button onClick={() => setPostImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => void handleImagePick(e)} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading || postImages.length >= 3}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-semibold disabled:opacity-40">
              <ImagePlus size={14} />
              {uploading ? 'Uploading...' : `Photo (${postImages.length}/3)`}
            </button>
            <button onClick={() => { setShowComposer(false); setPostImages([]) }} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold">Cancel</button>
            <button onClick={() => void submitPost()} disabled={uploading} className="flex-1 py-2 rounded-lg bg-brand-500 text-black text-xs font-bold disabled:opacity-50">Post</button>
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="px-4 mt-4 space-y-3">
        {posts.length === 0 && !loading && (
          <div className="text-center py-16">
            <Tag size={40} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No posts yet</p>
            <p className="text-zinc-600 text-xs mt-1">Be the first to post a want-request</p>
            {!staff && <button onClick={() => setShowComposer(true)} className="mt-4 bg-brand-500 text-black text-xs font-bold px-5 py-2.5 rounded-xl">Post Now</button>}
          </div>
        )}

        {posts.map(post => (
          <div key={post.id} className="bg-zinc-900 rounded-2xl p-4">
            {/* Post header */}
            <div className="flex items-start gap-3">
              <button
                onClick={() => setProfileSheet({ userId: post.author_id, name: post.author_name, roles: post.author_roles })}
                className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0"
              >
                {post.author_name.charAt(0).toUpperCase()}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setProfileSheet({ userId: post.author_id, name: post.author_name, roles: post.author_roles })}
                    className="font-semibold text-white text-sm hover:underline"
                  >
                    {post.author_name}
                  </button>
                  <UserTicks userId={post.author_id} size={14} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${post.post_type === 'want' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {post.post_type === 'want' ? 'BUYING' : 'SELLING'}
                  </span>
                  <span className="text-xs text-zinc-500">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-zinc-200 text-sm mt-1 leading-relaxed">{post.content}</p>
                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {post.hashtags.map(tag => (
                      <span key={tag} className="text-xs text-brand-400 font-medium">{tag}</span>
                    ))}
                  </div>
                )}
                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className={`mt-2 grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.images.map((url, i) => <img key={i} src={url} alt="" className="w-full rounded-lg object-cover max-h-48" />)}
                  </div>
                )}
              </div>
            </div>

            {/* Replies count */}
            {post.replies.length > 0 && (
              <button
                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                className="flex items-center gap-1.5 mt-3 text-xs text-zinc-400 hover:text-white"
              >
                <MessageCircle size={14} />
                {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                {expandedPost === post.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            {/* Expanded replies */}
            {expandedPost === post.id && (
              <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                {post.replies.map(reply => (
                  <div key={reply.id} className="bg-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProfileSheet({ userId: reply.author_id, name: reply.author_name, roles: reply.author_roles })}
                          className="w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold text-white"
                        >
                          {reply.author_name.charAt(0).toUpperCase()}
                        </button>
                        <button
                          onClick={() => setProfileSheet({ userId: reply.author_id, name: reply.author_name, roles: reply.author_roles })}
                          className="text-sm font-semibold text-white hover:underline"
                        >
                          {reply.author_name}
                        </button>
                        <UserTicks userId={reply.author_id} size={13} />
                        <span className="text-xs text-zinc-500">{timeAgo(reply.created_at)}</span>
                      </div>
                      {reply.price && <span className="text-brand-500 font-bold text-sm">₦{reply.price.toLocaleString()}</span>}
                    </div>
                    <p className="text-zinc-300 text-sm mt-1.5 ml-9">{reply.content}</p>

                    {/* DM gating */}
                    {(DEV || (post.author_id === uid && canDM(myRoles, reply.author_roles))) && reply.author_id !== uid && (
                      <button
                        onClick={() => void startDM(reply.author_id, reply.author_roles)}
                        className="ml-9 mt-2 text-xs text-brand-500 font-semibold flex items-center gap-1"
                      >
                        <MessageCircle size={12} /> Message seller
                      </button>
                    )}
                    {!DEV && post.author_id !== uid && (
                      <div className="ml-9 mt-2 flex items-center gap-1 text-xs text-zinc-600">
                        <Lock size={11} /> Only the poster can message repliers
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="flex gap-2 mt-3">
              {!staff && post.post_type === 'want' && post.author_id !== uid && (
                <button
                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 font-semibold"
                >
                  <Tag size={13} /> Reply with Price
                </button>
              )}
              {!staff && post.post_type === 'offer' && (
                <button
                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 font-semibold"
                >
                  <MessageCircle size={13} /> Comment
                </button>
              )}
            </div>

            {/* Reply composer */}
            {replyingTo === post.id && (
              <div className="mt-3 bg-zinc-800 rounded-xl p-3">
                {post.post_type === 'want' && (
                  <input
                    type="number"
                    value={replyPrice}
                    onChange={e => setReplyPrice(e.target.value)}
                    placeholder="Your price in ₦ (optional)"
                    className="w-full bg-zinc-700 text-white text-xs rounded-lg px-3 py-2 outline-none mb-2"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    value={replyContent}
                    onChange={e => { setReplyContent(e.target.value); handleTyping() }}
                    placeholder={post.post_type === 'want' ? 'I have this available...' : 'Ask a question...'}
                    className="flex-1 bg-zinc-700 text-white text-xs rounded-lg px-3 py-2 outline-none"
                  />
                  <button onClick={() => void submitReply(post.id)} className="bg-brand-500 text-black p-2 rounded-lg">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User profile sheet */}
      {profileSheet && (
        <UserProfileSheet
          userId={profileSheet.userId}
          name={profileSheet.name}
          roles={profileSheet.roles}
          onClose={() => setProfileSheet(null)}
          onDM={() => { void startDM(profileSheet.userId, profileSheet.roles); setProfileSheet(null) }}
          onFollow={() => void toggleFollow(profileSheet.userId)}
          isFollowing={follows.has(profileSheet.userId)}
        />
      )}
    </div>
  )
}