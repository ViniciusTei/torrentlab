import { TheMovieDbDetailsType } from '@/services/types/themoviedb'

interface Props {
  cast: TheMovieDbDetailsType['cast']
}

export default function MovieCast({ cast }: Props) {
  if (!cast || cast.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Elenco Principal</h2>
      <div className="flex flex-col gap-4">
        {cast.map((member) => (
          <div key={`${member.name}-${member.character}`} className="flex items-center gap-3">
            {member.profile_path ? (
              <img
                src={member.profile_path}
                alt={member.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-sm font-semibold">
                {member.name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.character}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
