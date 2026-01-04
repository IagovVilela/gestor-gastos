import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Receitas')
@ApiBearerAuth()
@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova receita' })
  @ApiResponse({ status: 201, description: 'Receita criada com sucesso' })
  create(@CurrentUser() user: { id: string }, @Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.create(user.id, createReceiptDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as receitas do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de receitas' })
  findAll(@CurrentUser() user: { id: string }, @Query() query: QueryReceiptDto) {
    return this.receiptsService.findAll(user.id, query);
  }

  @Get('monthly/:year/:month')
  @ApiOperation({ summary: 'Obter total de receitas do mês' })
  @ApiResponse({ status: 200, description: 'Total mensal calculado' })
  getMonthlyTotal(
    @CurrentUser() user: { id: string },
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.receiptsService.getMonthlyTotal(user.id, parseInt(year), parseInt(month));
  }

  @Get('by-category/:year/:month')
  @ApiOperation({ summary: 'Obter receitas agrupadas por categoria no mês' })
  @ApiResponse({ status: 200, description: 'Receitas agrupadas por categoria' })
  getByCategory(
    @CurrentUser() user: { id: string },
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.receiptsService.getByCategory(user.id, parseInt(year), parseInt(month));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter receita por ID' })
  @ApiResponse({ status: 200, description: 'Receita encontrada' })
  @ApiResponse({ status: 404, description: 'Receita não encontrada' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.receiptsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar receita' })
  @ApiResponse({ status: 200, description: 'Receita atualizada com sucesso' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(id, user.id, updateReceiptDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar receita' })
  @ApiResponse({ status: 200, description: 'Receita deletada com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.receiptsService.remove(id, user.id);
  }
}

