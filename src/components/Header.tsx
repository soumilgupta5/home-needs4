import { Link, useRouter } from "@tanstack/react-router";
import { ShoppingCart, User as UserIcon, Languages, LogOut, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 mr-auto">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">HN</span>
          <span className="font-display font-bold text-lg tracking-tight">{t("appName")}</span>
        </Link>

        <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "hi" : "en")} className="gap-1">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{lang === "en" ? "हिंदी" : "EN"}</span>
        </Button>

        <Link to="/cart">
          <Button variant="ghost" size="sm" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </Button>
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><UserIcon className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link to="/account">{t("account")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/orders">{t("orders")}</Link></DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2"><Shield className="h-4 w-4" />{t("admin")}</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />{t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth"><Button size="sm">{t("login")}</Button></Link>
        )}
      </div>
    </header>
  );
}
