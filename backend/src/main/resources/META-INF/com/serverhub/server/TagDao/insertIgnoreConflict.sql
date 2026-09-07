insert into tags (name)
values (/* name */'x')
on conflict (name) do nothing
