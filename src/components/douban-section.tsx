'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/lib/store';
import type { DoubanItem } from '@/lib/types';
import { CoverFlow } from './cover-flow';
import { CoverFlowSkeleton } from './cover-flow-skeleton';
import { PixelSegmented } from './pixel-dock';

const MOVIE_TAGS = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动画'];
const TV_TAGS = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 首页推荐区：数据源由设置决定（豆瓣热门 / Bangumi 新番放送 / 影视热榜），二选一展示 */
export function RecommendSection({ onPick }: { onPick: (title: string) => void }) {
  const doubanEnabled = useAppStore((s) => s.doubanEnabled);
  const recommendSource = useAppStore((s) => s.recommendSource);

  if (!doubanEnabled) return null;
  if (recommendSource === 'bangumi') return <BangumiView onPick={onPick} />;
  if (recommendSource === 'hot-list') return <HotListView onPick={onPick} />;
  return <DoubanView onPick={onPick} />;
}

/**
 * 豆瓣推荐：影视切换 + 标签筛选。
 * 一次性渲染全部条目：数据本就一次拉全（50 条），卡片图片又是 lazy 加载，
 * 视口外的图不会请求，因此不需要「加载更多」这类本地切片分页来打断浏览。
 */
function DoubanView({ onPick }: { onPick: (title: string) => void }) {
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [tag, setTag] = useState('热门');

  const query = useQuery({
    queryKey: ['douban', type, tag],
    queryFn: ({ signal }) => api.douban(type, tag, 0, 50, signal),
  });

  const tags = type === 'movie' ? MOVIE_TAGS : TV_TAGS;
  const items = query.data?.items ?? [];

  const switchType = (t: 'movie' | 'tv') => {
    if (t === type) return;
    setType(t);
    setTag('热门');
  };

  return (
    <section aria-label="影视推荐">
      <div className="mb-3">
        <PixelSegmented
          ariaLabel="影视类型"
          value={type}
          onChange={(id) => switchType(id as 'movie' | 'tv')}
          options={[
            { id: 'movie', label: '电影' },
            { id: 'tv', label: '剧集' },
          ]}
        />
      </div>

      <div className="mb-4">
        <PixelSegmented
          ariaLabel="内容标签"
          value={tag}
          onChange={setTag}
          options={tags.map((t) => ({ id: t, label: t }))}
        />
      </div>

      {query.isError ? (
        <p className="text-center text-sm text-faint py-8">推荐内容加载失败，可稍后重试或在设置中关闭</p>
      ) : query.isLoading ? (
        <CoverFlowSkeleton />
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-faint py-8">该分类暂无推荐内容</p>
      ) : (
        <CoverFlow
          items={items}
          keyOf={(item) => item.id}
          titleOf={(item) => item.title}
          picOf={(item) => item.cover}
          metaOf={(item) => (item.rating ? `豆瓣评分 ${item.rating}` : undefined)}
          onOpen={(item) => onPick(item.title)}
          actionLabel="搜索这部"
        />
      )}
    </section>
  );
}

/** Bangumi 每日放送：星期筛选，一次拉全量无分页 */
function BangumiView({ onPick }: { onPick: (title: string) => void }) {
  const [weekday, setWeekday] = useState<number | 'all'>('all');

  const query = useQuery({
    queryKey: ['bangumi-calendar'],
    queryFn: ({ signal }) => api.bangumiCalendar(signal),
  });

  let items: DoubanItem[] = [];
  if (query.data) {
    items = weekday === 'all'
      ? query.data.days.flatMap((d) => d.items)
      : (query.data.days.find((d) => d.weekday === weekday)?.items ?? []);
  }

  return (
    <section aria-label="新番放送推荐">
      <div className="mb-4">
        <PixelSegmented
          ariaLabel="星期筛选"
          value={weekday === 'all' ? 'all' : String(weekday)}
          onChange={(id) => setWeekday(id === 'all' ? 'all' : Number(id))}
          options={[
            { id: 'all', label: '全部' },
            ...WEEKDAYS.map((name, i) => ({ id: String(i + 1), label: name })),
          ]}
        />
      </div>

      {query.isError ? (
        <p className="text-center text-sm text-faint py-8">推荐内容加载失败，可稍后重试或在设置中关闭</p>
      ) : query.isLoading ? (
        <CoverFlowSkeleton />
      ) : (
        <CoverFlow
          items={items}
          keyOf={(item) => item.id}
          titleOf={(item) => item.title}
          picOf={(item) => item.cover}
          metaOf={(item) => (item.rating ? `豆瓣评分 ${item.rating}` : undefined)}
          onOpen={(item) => onPick(item.title)}
          actionLabel="搜索这部"
        />
      )}
    </section>
  );
}

const HOT_LISTS = [
  { id: 'douban_movie_weekly', label: '电影周榜' },
  { id: 'douban_tv_chinese', label: '国产剧周榜' },
  { id: 'douban_tv_global', label: '海外剧周榜' },
  { id: 'douban_show_chinese', label: '国内综艺' },
  { id: 'douban_show_global', label: '海外综艺' },
  { id: 'baidu_teleplay', label: '百度热播剧' },
];

/** 影视热榜（60s API）：豆瓣五个周榜 + 百度热播剧，chips 切换 */
function HotListView({ onPick }: { onPick: (title: string) => void }) {
  const [listId, setListId] = useState(HOT_LISTS[0].id);

  const query = useQuery({
    queryKey: ['hot-list', listId],
    queryFn: ({ signal }) => api.hotList(listId, signal),
  });

  const items = query.data?.items ?? [];

  return (
    <section aria-label="影视榜单推荐">
      <div className="mb-4">
        <PixelSegmented
          ariaLabel="影视榜单"
          value={listId}
          onChange={setListId}
          options={HOT_LISTS.map((l) => ({ id: l.id, label: l.label }))}
        />
      </div>

      {query.isError ? (
        <p className="text-center text-sm text-faint py-8">推荐内容加载失败，可稍后重试或在设置中关闭</p>
      ) : query.isLoading ? (
        <CoverFlowSkeleton />
      ) : (
        <CoverFlow
          items={items}
          keyOf={(item) => item.id}
          titleOf={(item) => item.title}
          picOf={(item) => item.cover}
          metaOf={(item) => (item.rating ? `豆瓣评分 ${item.rating}` : undefined)}
          onOpen={(item) => onPick(item.title)}
          actionLabel="搜索这部"
        />
      )}
    </section>
  );
}
