import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PlaceholderStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sadržaj koraka</CardTitle>
        <CardDescription>
          Radni prikaz ovog koraka biće dodat u narednim fazama razvoja. Status koraka se već vodi i trajno čuva, a
          podaci koje unesu specijalizovani agenti prikazuju se u panelu „Znanje o projektu".
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
