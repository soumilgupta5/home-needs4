import { Link, useRouter } from "@tanstack/react-router";
import { ShoppingCart, User as UserIcon, Languages, LogOut, Shield, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header({ transparent = false }: { transparent?: boolean } = {}) {
  const { t, lang, setLang } = useI18n();
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className={transparent 
      ? "absolute top-0 w-full z-40 text-white" 
      : "sticky top-0 z-40 bg-background/90 backdrop-blur border-b"
    }>
      <div className="w-full px-4 md:px-8 h-14 flex items-center gap-2">
        <Link to="/" className="mr-auto">
          <Button variant="ghost" size="sm" className={`gap-2 px-2 ${transparent ? 'hover:bg-white/20 hover:text-white' : ''}`}>
            <Home className="h-5 w-5" />
            <span className="font-display font-semibold text-base hidden sm:inline">{t("appName")}</span>
          </Button>
        </Link>

        <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "hi" : "en")} className={`gap-1 ${transparent ? 'hover:bg-white/20 hover:text-white' : ''}`}>
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{lang === "en" ? "हिंदी" : "EN"}</span>
        </Button>

        <Link to="/cart">
          <Button variant="ghost" size="sm" className={`relative ${transparent ? 'hover:bg-white/20 hover:text-white' : ''}`}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className={`absolute -top-1 -right-1 text-[10px] font-semibold rounded-full h-4 min-w-4 px-1 flex items-center justify-center ${transparent ? 'bg-white text-primary' : 'bg-primary text-primary-foreground'}`}>
                {count}
              </span>
            )}
          </Button>
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={transparent ? 'hover:bg-white/20 hover:text-white' : ''}><UserIcon className="h-5 w-5" /></Button>
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
          <Link to="/auth"><Button size="sm" variant={transparent ? "secondary" : "default"} className={transparent ? 'bg-white/20 hover:bg-white/30 text-white border-none' : ''}>{t("login")}</Button></Link>
        )}
      </div>
    </header>
  );
}
