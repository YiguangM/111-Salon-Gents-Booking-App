export function SiteFooter({
  shopName,
  address,
  phone,
}: {
  shopName: string;
  address: string;
  phone: string;
}) {
  return (
    <footer className="mt-auto border-t border-black/10 bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {shopName}
        </p>
        <p>
          {address}
          {phone && <> &middot; <span dir="ltr">{phone}</span></>}
        </p>
      </div>
    </footer>
  );
}
