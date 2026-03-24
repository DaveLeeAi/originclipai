export default function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-lg bg-[#5046e5]/10" />
        <p className="text-sm text-[#a09e96]">Loading...</p>
      </div>
    </div>
  );
}
