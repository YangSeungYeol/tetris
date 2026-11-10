import React from "react";
import { createRoot } from "react-dom/client";
import {
  Alert, AppBar, Button, Card, CardContent, CardHeader, Chip, Container,
  CssBaseline, Divider, Grid, List, ListItem, ListItemText, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, ThemeProvider, Toolbar, Typography,
  createTheme, useMediaQuery,
} from "@mui/material";

const theme = createTheme();
const controls = [
  ["좌우 이동", "← / →", "왼쪽 / 오른쪽 버튼 · 길게 누르면 반복 이동"],
  ["블록 회전", "↑", "회전 버튼"],
  ["빠르게 내리기", "↓", "아래 버튼 · 길게 누르면 반복 낙하"],
  ["즉시 떨어뜨리기", "Space", "즉시 낙하 버튼"],
  ["일시정지 / 재개", "P", "일시정지 / 계속하기 버튼"],
];

function Landing() {
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppBar position="static">
      <Toolbar>
        <Container maxWidth="md">
          <Stack direction="row" spacing={2}>
            <Typography variant="h6">테트리스</Typography>
            <Button color="inherit" component="a" href="#how-to-play">플레이 방법</Button>
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
    <Container maxWidth="md" component="main">
      <Stack spacing={3}>
        <CardHeader title={<Typography variant={compact ? "h4" : "h3"} component="h1">한 줄씩, 가볍게.</Typography>}
          subheader="익숙한 블록, 경쾌한 코로베이니카. 잠깐의 여유를 한 판의 즐거움으로 바꿔보세요." />
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Typography variant="h5" component="h2">쌓고, 채우고, 비우는 재미</Typography>
              <Typography color="text.secondary">
                내려오는 블록을 움직여 가로줄을 빈틈없이 채워보세요. 완성된 줄은 사라지고 점수가 올라갑니다.
                컴퓨터에서는 키보드로, 휴대폰에서는 화면 버튼으로 바로 즐길 수 있어요.
              </Typography>
              <Grid container spacing={1}>
                {["PC · 모바일", "설치 없이 플레이", "코로베이니카 BGM"].map(label =>
                  <Grid key={label}><Chip label={label} variant="outlined" /></Grid>,
                )}
              </Grid>
              <Button id="play-button" component="a" href="game.html#play" variant="contained" size="large" fullWidth>
                플레이
              </Button>
              <Typography variant="caption" color="text.secondary">게임 화면으로 이동하면 바로 시작합니다. 음악은 첫 터치나 키보드 입력 후 재생됩니다.</Typography>
            </Stack>
          </CardContent>
        </Card>

        <section id="how-to-play" aria-labelledby="how-heading">
          <Stack spacing={2}>
            <Typography id="how-heading" variant="h4" component="h2">플레이 방법</Typography>
            <Grid container spacing={2}>
              {[
                ["1. 블록을 움직여요", "좌우로 움직이거나 회전해서 블록이 들어갈 자리를 찾아보세요."],
                ["2. 한 줄을 채워요", "가로 10칸을 빈틈없이 채우면 줄이 사라집니다. 여러 줄을 한 번에 지우면 더 많은 점수를 얻어요."],
                ["3. 한 판 더 도전해요", "새 블록이 들어올 공간이 없으면 게임이 끝납니다. 다시 도전하기로 새 게임을 시작하세요."],
              ].map(([title, text]) => <Grid key={title} size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined"><CardContent>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" component="h3">{title}</Typography>
                    <Typography variant="body2" color="text.secondary">{text}</Typography>
                  </Stack>
                </CardContent></Card>
              </Grid>)}
            </Grid>
            <Card variant="outlined">
              <CardHeader title="컴퓨터에서는 키보드로" />
              <Table size="small" aria-label="PC 키보드 조작 방법">
                <TableBody>{controls.map(([action, key]) => <TableRow key={action}>
                  <TableCell><Chip component="kbd" label={key} size="small" variant="outlined" /></TableCell>
                  <TableCell>{action}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </Card>
            <Card variant="outlined">
              <CardHeader title="휴대폰에서는 화면 버튼으로" subheader="버튼을 탭해서 조작하세요. 이동과 내리기는 길게 누를 수 있어요." />
              <List dense>{controls.map(([action, , mobile]) => <ListItem key={action}>
                <ListItemText primary={action} secondary={mobile} />
              </ListItem>)}</List>
            </Card>
            <Card variant="outlined">
              <CardHeader title="점수는 이렇게 올라가요" subheader="한 번에 지운 줄 수를 기준으로 점수를 더합니다." />
              <Table size="small" aria-label="줄 제거 점수">
                <TableHead><TableRow>{[1, 2, 3, 4].map(lines => <TableCell key={lines} align="center">{lines}줄</TableCell>)}</TableRow></TableHead>
                <TableBody><TableRow>{[100, 300, 500, 800].map(score => <TableCell key={score} align="center">{score}점</TableCell>)}</TableRow></TableBody>
              </Table>
            </Card>
          </Stack>
        </section>
        <Alert severity="info">다른 창이나 앱으로 이동하면 게임과 음악이 함께 멈춥니다. 돌아온 뒤 계속하기를 눌러주세요. 음악과 볼륨은 게임 화면에서 조절할 수 있어요.</Alert>
        <Button component="a" href="game.html#play" variant="contained" size="large" fullWidth>지금 플레이</Button>
        <Divider />
        <Typography component="footer" variant="body2" color="text.secondary" align="center" gutterBottom>오직 쌓고, 비우는 즐거움.</Typography>
      </Stack>
    </Container>
  </ThemeProvider>;
}

createRoot(document.getElementById("root")).render(<Landing />);
