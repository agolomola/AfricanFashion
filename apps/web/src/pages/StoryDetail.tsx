import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api, resolveAssetUrl } from '../services/api';
import { fashionFallbackImage } from '../utils/fashionPlaceholder';

const stripUnsafeHtml = (value: string) =>
  String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

export default function StoryDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['homepageStory', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const response = await api.homepageSections.getStoryBySlug(String(slug || ''));
      return response.success ? response.data : null;
    },
  });

  const safeHtml = useMemo(() => stripUnsafeHtml(String(data?.contentHtml || '')), [data?.contentHtml]);
  const coverImage =
    resolveAssetUrl(data?.coverImage) ||
    fashionFallbackImage(`story-${slug || 'default'}`, { width: 1400, height: 900 });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-16">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Story not found</h1>
          <p className="text-gray-600 mb-6">The story you requested is unavailable or no longer active.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F5F0] min-h-screen">
      <section className="relative h-[320px] md:h-[420px] overflow-hidden">
        <img src={coverImage} alt={data.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex items-end">
          <div className="px-4 sm:px-6 lg:px-8 xl:px-12 pb-10 text-white max-w-4xl">
            <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-5xl font-bold">{data.title}</h1>
            {data.subtitle ? <p className="text-white/85 mt-3 text-base md:text-lg">{data.subtitle}</p> : null}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
        <article className="max-w-4xl mx-auto bg-white border border-gray-200 p-6 md:p-10">
          <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: safeHtml }} />
        </article>
      </section>
    </div>
  );
}
