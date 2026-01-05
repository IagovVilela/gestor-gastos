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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Despesas')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova despesa' })
  @ApiResponse({ status: 201, description: 'Despesa criada com sucesso' })
  create(@CurrentUser() user: { id: string }, @Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(user.id, createExpenseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as despesas do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de despesas' })
  findAll(@CurrentUser() user: { id: string }, @Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(user.id, query);
  }

  @Get('monthly/:year/:month')
  @ApiOperation({ summary: 'Obter total de despesas do mês' })
  @ApiResponse({ status: 200, description: 'Total mensal calculado' })
  getMonthlyTotal(
    @CurrentUser() user: { id: string },
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.expensesService.getMonthlyTotal(user.id, parseInt(year), parseInt(month));
  }

  @Get('by-category/:year/:month')
  @ApiOperation({ summary: 'Obter despesas agrupadas por categoria no mês' })
  @ApiResponse({ status: 200, description: 'Despesas agrupadas por categoria' })
  getByCategory(
    @CurrentUser() user: { id: string },
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.expensesService.getByCategory(user.id, parseInt(year), parseInt(month));
  }

  @Get('credit-card')
  @ApiOperation({ summary: 'Obter despesas do cartão de crédito (fatura)' })
  @ApiResponse({ status: 200, description: 'Despesas do cartão de crédito' })
  getCreditCardExpenses(@CurrentUser() user: { id: string }) {
    return this.expensesService.getCreditCardExpenses(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter despesa por ID' })
  @ApiResponse({ status: 200, description: 'Despesa encontrada' })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.expensesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar despesa' })
  @ApiResponse({ status: 200, description: 'Despesa atualizada com sucesso' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.id, updateExpenseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar despesa' })
  @ApiResponse({ status: 200, description: 'Despesa deletada com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.expensesService.remove(id, user.id);
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Marcar despesa como paga' })
  @ApiResponse({ status: 200, description: 'Despesa marcada como paga' })
  markAsPaid(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() markPaidDto?: MarkPaidDto,
  ) {
    return this.expensesService.markAsPaid(id, user.id, markPaidDto?.paymentBankId);
  }

  @Patch(':id/mark-unpaid')
  @ApiOperation({ summary: 'Marcar despesa como não paga' })
  @ApiResponse({ status: 200, description: 'Despesa marcada como não paga' })
  markAsUnpaid(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.expensesService.markAsUnpaid(id, user.id);
  }
}


