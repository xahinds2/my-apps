import Link from 'next/link';

const APPS = [
	{ label: 'Manifest', href: '/manifest', desc: 'Track things you want' },
	{ label: 'Finance', href: '/finance', desc: 'Budget & allocations' },
];

const COMING = ['Flex Cards', 'Healthify', 'Travel'];

export default function Footer() {
	return (
		<footer className="w-full border-t border-[#e8e8e8] dark:border-[#1a1a1a] bg-white dark:bg-black">
			<div className="max-w-4xl mx-auto px-6 pt-44 pb-12">

				{/* Top row */}
				<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-10">

					{/* Brand */}
					<div className="space-y-2 max-w-xs">
						<p className="text-sm font-semibold text-[#0a0a0a] dark:text-white tracking-tight">Sahin&apos;s Apps</p>
						<p className="text-xs text-[#999] dark:text-[#555] leading-relaxed">
							A personal suite of minimal tools — built for everyday life.
						</p>
					</div>

					{/* Links */}
					<div className="flex gap-12">
						<div className="space-y-3">
							<p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#444]">Apps</p>
							{APPS.map(({ label, href, desc }) => (
								<div key={href}>
									<Link href={href} className="text-xs text-[#555] dark:text-[#888] hover:text-[#0a0a0a] dark:hover:text-white transition font-medium">
										{label}
									</Link>
									<p className="text-[10px] text-[#bbb] dark:text-[#444] mt-0.5">{desc}</p>
								</div>
							))}
						</div>

						<div className="space-y-3">
							<p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#444]">Coming soon</p>
							{COMING.map(name => (
								<p key={name} className="text-xs text-[#ccc] dark:text-[#333]">{name}</p>
							))}
						</div>
					</div>
				</div>

				{/* Bottom rule + year */}
				<div className="mt-14 pt-6 border-t border-[#f0f0f0] dark:border-[#111] flex items-center justify-between">
					<p className="text-[11px] text-[#ccc] dark:text-[#333]">© {new Date().getFullYear()} Sahin&apos;s Apps</p>
					<p className="text-[11px] text-[#ddd] dark:text-[#222]">Made with care</p>
				</div>
			</div>
		</footer>
	);
}
