export default function LoginPage() {
  return (
    <main className="shell py-16">
      <div className="mx-auto max-w-xl card p-8">
        <p className="muted">Account Access</p>
        <h1 className="mt-3 font-display text-4xl text-forest-900">Sign in to your Natlovers account</h1>
        <form className="mt-8 space-y-4">
          <input name="email" placeholder="Email" className="w-full rounded-2xl border border-forest-100 px-4 py-3 outline-none" />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-forest-100 px-4 py-3 outline-none"
          />
          <button className="w-full rounded-full bg-forest-900 px-5 py-3 text-sm text-sand-50">Sign in</button>
        </form>
      </div>
    </main>
  );
}
