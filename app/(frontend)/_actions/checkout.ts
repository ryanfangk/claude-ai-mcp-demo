'use server'

import { redirect } from 'next/navigation'
import { getSessionContext } from '@/lib/auth'

// Mock checkout action. Called from the form on /checkout/[slug].
//
// What we DON'T do (intentionally, demo):
//  - No Stripe / no real payment intent / no webhook
//  - No double-purchase protection (a user can buy the same product
//    N times; not a concern for the demo)
//  - No inventory / availability / sold-out checks
//
// What we DO do:
//  - Require an authenticated `users`-collection session
//  - Look up the product by slug under the storefront's public read access
//  - Create one `purchases` row owned by the session user
//  - The Purchases collection's beforeValidate hook snapshots
//    priceAtPaid / currency / categoryAtPaid / purchasedAt from the
//    product, so the row records what the customer "paid" at the time
//
// Uses overrideAccess: true on the create because the Purchases
// collection's create access is admins-only — the storefront checkout
// path is itself the trusted-server side of "letting users create
// purchases," scoped explicitly to req.user here.

type ActionState = { error?: string } | undefined

export async function checkoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const slug = formData.get('slug')
  if (typeof slug !== 'string' || !slug) {
    return { error: 'Missing product reference.' }
  }

  const { payload, user } = await getSessionContext()
  if (!user) {
    redirect(`/login?next=/checkout/${encodeURIComponent(slug)}`)
  }

  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const product = found.docs[0]
  if (!product) {
    return { error: 'That product is no longer available.' }
  }

  // Pass the snapshot fields explicitly — even though the Purchases
  // beforeValidate hook would fill them, the generated TS type for
  // payload.create lists priceAtPaid as required and can't see through
  // hooks. Doing it here is also clearer about what "the customer paid"
  // resolves to from the storefront's point of view.
  const price = typeof product.price === 'number' ? product.price : 0
  const currency = typeof product.currency === 'string' ? product.currency : 'usd'
  const category = typeof product.category === 'string' ? product.category : null

  try {
    await payload.create({
      collection: 'purchases',
      data: {
        user: user.id as string,
        product: product.id as string,
        priceAtPaid: price,
        currency: currency as 'usd' | 'cad' | 'eur',
        categoryAtPaid: category as never,
        status: 'completed',
        purchasedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Mock checkout failed: ${msg}` }
  }

  redirect(`/checkout/success?slug=${encodeURIComponent(slug)}`)
}
