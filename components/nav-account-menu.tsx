"use client";

import Image from "next/image";
import Link from "next/link";
import {CircleHelp, CreditCard, Heart, LogOut, Package, Settings, User} from "lucide-react";
import {useDelayedMount} from "@/components/use-delayed-mount";

type MenuItem = {
  href: {pathname: "/account"; query?: {tab: string}};
  label: string;
  icon: typeof User;
};

const menuItems: MenuItem[] = [
  {href: {pathname: "/account"}, label: "My profile", icon: User},
  {href: {pathname: "/account", query: {tab: "orders"}}, label: "Orders & purchases", icon: Package},
  {href: {pathname: "/account", query: {tab: "wishlist"}}, label: "Wishlist", icon: Heart},
  {href: {pathname: "/account", query: {tab: "payment"}}, label: "Payment methods", icon: CreditCard},
  {href: {pathname: "/account", query: {tab: "settings"}}, label: "Account settings", icon: Settings},
  {href: {pathname: "/account", query: {tab: "help"}}, label: "Help & support", icon: CircleHelp}
];

// Stagger step between menu item rows on entrance, capped at the 5th item
// so a longer list doesn't drag the reveal out.
const STAGGER_STEP_MS = 20;
const STAGGER_CAP_INDEX = 4;
const EXIT_MS = 130;

export function NavAccountMenu({
  open,
  name,
  email,
  image,
  onNavigate,
  onSignOut
}: {
  open: boolean;
  name: string;
  email: string;
  image?: string | null;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const {mounted, entered} = useDelayedMount(open, EXIT_MS);

  if (!mounted) {
    return null;
  }

  return (
    <div
      style={{transformOrigin: "top right"}}
      className={`menu-surface absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-lg border border-[#e4d9c1] bg-[rgba(250,246,236,0.98)] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
        entered
          ? "scale-100 opacity-100 duration-[180ms]"
          : `scale-[0.94] opacity-0 ${open ? "duration-[180ms]" : "duration-[130ms]"}`
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-forest-900">
          {image ? (
            <Image src={image} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-sand-50">
              {(name || email).charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-forest-900">{name}</p>
          <p className="truncate text-xs text-forest-500">{email}</p>
        </div>
      </div>

      <div className="my-1 h-px bg-[#e4d9c1]" />

      <div className="py-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const delayMs = open ? Math.min(index, STAGGER_CAP_INDEX) * STAGGER_STEP_MS : 0;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              style={{transitionDelay: `${delayMs}ms`}}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-forest-700 transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/70 hover:text-forest-900 ${
                entered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              }`}
            >
              <Icon className="h-4 w-4 text-forest-500" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="my-1 h-px bg-[#e4d9c1]" />

      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#a4402b] transition-colors duration-150 hover:bg-[#f7e9e2]"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
