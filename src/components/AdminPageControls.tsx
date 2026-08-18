"use client";

type Props = {
  page: number;
  pages: number;
  pageSize: number;
  search: string;
  filter: string;
  sort: string;
  filters: { value: string; label: string }[];
  sorts: { value: string; label: string }[];
  onChange: (
    next: Partial<{
      page: number;
      pageSize: number;
      search: string;
      filter: string;
      sort: string;
      direction: "asc" | "desc";
    }>,
  ) => void;
};

const control =
  "cursor-pointer rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-red-500";

export default function AdminPageControls(props: Props) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <input
        aria-label="Search"
        value={props.search}
        onChange={(event) =>
          props.onChange({ search: event.target.value, page: 1 })
        }
        placeholder="Search..."
        className={`${control} min-w-52 flex-1`}
      />
      <select
        aria-label="Filter"
        value={props.filter}
        onChange={(event) =>
          props.onChange({ filter: event.target.value, page: 1 })
        }
        className={control}
      >
        <option value="all">All</option>
        {props.filters.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort"
        value={props.sort}
        onChange={(event) =>
          props.onChange({ sort: event.target.value, page: 1 })
        }
        className={control}
      >
        {props.sorts.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Items per page"
        value={props.pageSize}
        onChange={(event) =>
          props.onChange({ pageSize: Number(event.target.value), page: 1 })
        }
        className={control}
      >
        {[5, 10, 25, 50].map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => props.onChange({ direction: "asc", page: 1 })}
        className={control}
      >
        Ascending
      </button>
      <button
        type="button"
        onClick={() => props.onChange({ direction: "desc", page: 1 })}
        className={control}
      >
        Descending
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={props.page <= 1}
          onClick={() => props.onChange({ page: props.page - 1 })}
          className={`${control} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Previous
        </button>
        <span className="text-sm text-gray-300">
          Page {props.page} of {props.pages}
        </span>
        <button
          type="button"
          disabled={props.page >= props.pages}
          onClick={() => props.onChange({ page: props.page + 1 })}
          className={`${control} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
