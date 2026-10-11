// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { post_id, group_id, author_id, content } = await req.json() as {
      post_id: string
      group_id: string
      author_id: string
      content: string
    }

    // Get the group name and author name in parallel
    const [groupRes, authorRes] = await Promise.all([
      supabase.from('market_groups').select('name').eq('id', group_id).single(),
      supabase.from('profiles').select('display_name').eq('id', author_id).single(),
    ])

    const groupName = groupRes.data?.name ?? 'Market Group'
    const authorName = authorRes.data?.display_name ?? 'Someone'
    const preview = content?.slice(0, 80) ?? 'Posted a picture'

    // Get all subscribers to this group EXCEPT the post author
    const { data: subs } = await supabase
      .from('group_subscriptions')
      .select('user_id')
      .eq('group_id', group_id)
      .eq('status', 'active')
      .neq('user_id', author_id)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { status: 200 })
    }

    // Batch insert notifications for all subscribers
    const notifications = subs.map((sub: { user_id: string }) => ({
      user_id: sub.user_id,
      type: 'group_reply',
      title: `New picture post in ${groupName}`,
      body: `${authorName}: "${preview}"`,
      data: { group_id, post_id },
      link: `/groups/${group_id}`,
      is_read: false,
    }))

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100
    let notified = 0
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      const { error } = await supabase.from('notifications').insert(batch)
      if (!error) notified += batch.length
    }

    console.log(`Notified ${notified} subscribers in group ${groupName}`)
    return new Response(JSON.stringify({ notified, group: groupName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-group-post error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
